import { z } from 'zod';
import { adminDb } from '@/lib/server/auth';
import { apiError, boundedBody, ApiError } from '@/lib/server/http';
import {
  workspaceIdentity,
  workspaceResponse,
  workspaceError,
  ownedWorkspace,
  finishWorkspace,
} from '@/lib/server/workspaces';
import { workspaceSchema, WORKSPACE_LIMIT } from '@/lib/workspace-types';
import { CLOUD_BUCKET, pdfName } from '@/lib/cloud-types';
type Context = { params: Promise<{ id: string }> };
async function owner(request: Request, context: Context, allowDeleting = false) {
  const identity = await workspaceIdentity(request);
  const parsed = z.uuid().safeParse((await context.params).id);
  if (!parsed.success) throw new ApiError(404, 'This document is unavailable.');
  return { identity, file: await ownedWorkspace(identity, parsed.data, allowDeleting) };
}
export async function GET(request: Request, context: Context) {
  try {
    const { file } = await owner(request, context);
    if (file.status !== 'ready')
      throw new ApiError(
        409,
        'This document has not finished uploading. Return to the original tab and retry.',
      );
    const signed = await adminDb().storage.from(CLOUD_BUCKET).createSignedUrl(file.object_path, 60);
    if (signed.error) throw new ApiError(503, 'This document could not be opened. Please retry.');
    return workspaceResponse(request, {
      id: file.id,
      name: file.name,
      revision: file.workspace_revision,
      snapshot: file.workspace,
      expiresAt: file.expires_at,
      updatedAt: file.updated_at,
      status: file.status,
      sourceUrl: signed.data.signedUrl,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { identity, file } = await owner(request, context);
    const action = JSON.parse((await boundedBody(request, WORKSPACE_LIMIT + 4096)).toString());
    if (action.action === 'rename') {
      const parsed = z
        .object({ action: z.literal('rename'), name: z.string().trim().min(1).max(160) })
        .strict()
        .safeParse(action);
      if (!parsed.success) throw new ApiError(400, 'Choose a valid file name.');
      const { error } = await adminDb().rpc('manage_editor_workspace', {
        actor: identity.actor,
        guest: identity.guest,
        document_id: file.id,
        operation: 'rename',
        file_name: pdfName(parsed.data.name),
        expected_revision: file.workspace_revision,
      });
      workspaceError(error);
      return workspaceResponse(request, { renamed: true });
    }
    if (action.action === 'finish') {
      await finishWorkspace(file);
      return workspaceResponse(request, { ready: true });
    }
    if (action.action === 'claim') {
      if (!identity.actor)
        throw new ApiError(401, 'Sign in to keep this document in your account.');
      const { error } = await adminDb().rpc('claim_editor_workspace', {
        actor: identity.actor,
        guest: identity.guest,
        document_id: file.id,
      });
      workspaceError(error);
      return workspaceResponse(request, { claimed: true, expiresAt: null });
    }
    const parsed = z
      .object({
        action: z.literal('save'),
        writeId: z.uuid(),
        revision: z.number().int().nonnegative(),
        name: z.string().min(1).max(255),
        snapshot: workspaceSchema,
      })
      .strict()
      .safeParse(action);
    if (!parsed.success)
      throw new ApiError(
        400,
        'This workspace could not be saved. Check the document settings and retry.',
      );
    const { data, error } = await adminDb().rpc('save_editor_workspace', {
      actor: identity.actor,
      guest: identity.guest,
      document_id: file.id,
      expected_revision: parsed.data.revision,
      snapshot: parsed.data.snapshot,
      file_name: pdfName(parsed.data.name),
      write_id: parsed.data.writeId,
    });
    workspaceError(error);
    return workspaceResponse(request, data);
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { identity, file } = await owner(request, context, true);
    const db = adminDb();
    // Lock and mark the authorized row first, so saving or claiming cannot race removal.
    const marked = await db.rpc('manage_editor_workspace', {
      actor: identity.actor,
      guest: identity.guest,
      document_id: file.id,
      operation: 'delete',
      file_name: null,
      expected_revision: null,
    });
    workspaceError(marked.error);
    const removed = await db.storage.from(CLOUD_BUCKET).remove([file.object_path]);
    if (removed.error)
      throw new ApiError(503, 'This file could not be fully removed. Please retry removing it.');
    const deleted = await db
      .from('cloud_documents')
      .delete()
      .eq('id', file.id)
      .eq('status', 'deleting');
    workspaceError(deleted.error);
    return workspaceResponse(request, { removed: true });
  } catch (error) {
    return apiError(error);
  }
}
