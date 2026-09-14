import {
  uploadWorkspace,
  saveWorkspace,
  claimWorkspace,
  readWorkspaceRecord,
} from './workspace-client';
import { pdfName } from './cloud-types';
import type { TextInspection } from './pro-types';
import type { WorkspaceSnapshot } from './workspace-types';
// JSONB can return object properties in a different order. Compare the actual
// content, including both text layers, independently of that ordering.
function canonicalJson(input: unknown) {
  return JSON.stringify(input, (_key, value) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, value[key]]),
        )
      : value,
  );
}
function workspaceKey(
  name: string,
  snapshot: WorkspaceSnapshot,
  inspectionKeys: WeakMap<TextInspection, string>,
) {
  const { inspection, ...editable } = snapshot;
  // Source inspection is immutable; text edits live in state.textChanges. Sorting
  // thousands of unchanged blocks on every keystroke stalls the input. Cache only
  // that source data; always compare the complete current editable state.
  let sourceKey = 'null';
  if (inspection) {
    const previous = inspectionKeys.get(inspection);
    sourceKey = previous ?? canonicalJson(inspection);
    if (previous === undefined) inspectionKeys.set(inspection, sourceKey);
  }
  return `${canonicalJson([pdfName(name), editable])}\n${sourceKey}`;
}
export type SyncStatus = {
  phase: 'pending' | 'uploading' | 'saving' | 'saved' | 'error';
  error?: string;
  updatedAt?: string;
  expiresAt?: string | null;
  revision: number;
};
// One queue per opened PDF. Writes never race, and edits made during an upload are saved next.
export class WorkspaceSync {
  private inspectionKeys = new WeakMap<TextInspection, string>();
  private latest: { name: string; snapshot: WorkspaceSnapshot; key: string } | null = null;
  private acknowledged = '';
  private uploaded: boolean;
  private revision: number;
  private running: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private active = true;
  private actor = '';
  private uploadName = '';
  private job: { name: string; snapshot: WorkspaceSnapshot; key: string; writeId: string } | null =
    null;
  private claimedActor = '';
  private status: SyncStatus;
  constructor(
    readonly id: string,
    private bytes: Uint8Array,
    private notify: (status: SyncStatus) => void,
    restored?: {
      revision: number;
      name: string;
      snapshot: WorkspaceSnapshot | null;
      updatedAt: string;
      expiresAt: string | null;
    },
  ) {
    this.uploaded = !!restored;
    this.revision = restored?.revision || 0;
    this.acknowledged = restored?.snapshot
      ? workspaceKey(restored.name, restored.snapshot, this.inspectionKeys)
      : '';
    this.status = {
      phase: this.acknowledged ? 'saved' : 'pending',
      revision: this.revision,
      updatedAt: restored?.updatedAt,
      expiresAt: restored?.expiresAt,
    };
  }
  private publish(value: Partial<SyncStatus>) {
    this.status = { ...this.status, ...value };
    if (this.active) this.notify(this.status);
  }
  update(name: string, snapshot: WorkspaceSnapshot) {
    const key = workspaceKey(name, snapshot, this.inspectionKeys);
    if (key === this.latest?.key) return;
    this.latest = { name, snapshot, key };
    if (key === this.acknowledged && !this.job) {
      this.publish({ phase: 'saved', error: undefined });
      return;
    }
    this.publish({ phase: 'pending', error: undefined });
    clearTimeout(this.timer);
    if (this.active)
      this.timer = setTimeout(() => void this.flush().catch(() => {}), this.uploaded ? 600 : 0);
  }
  setActor(actor: string) {
    if (actor === this.actor) return;
    this.actor = actor;
    if (actor && this.active) void this.flush().catch(() => {});
  }
  private requireActive() {
    if (!this.active) throw new Error('This document is no longer active. Reopen it to save.');
    if (!this.latest) throw new Error('Saving is not ready yet. Please retry.');
  }
  async flush(verify = false): Promise<void> {
    try {
      for (;;) {
        this.requireActive();
        clearTimeout(this.timer);
        this.running ||= this.work().finally(() => {
          this.running = null;
        });
        await this.running;
        this.requireActive();
        // A new edit can arrive after work() returns but before its promise
        // settles. Waiting for that old promise alone does not save the edit.
        if (this.job || this.latest!.key !== this.acknowledged) continue;
        if (verify) {
          const revision = this.revision;
          const key = this.acknowledged;
          const stored = await readWorkspaceRecord(this.id);
          this.requireActive();
          if (
            this.running !== null ||
            this.job ||
            this.revision !== revision ||
            this.latest!.key !== key
          )
            continue;
          if (
            stored.revision !== revision ||
            !stored.snapshot ||
            workspaceKey(stored.name, stored.snapshot, this.inspectionKeys) !== key
          ) {
            // Do not trust an earlier acknowledgement when a fresh read cannot
            // recover the same edits. A retry must send the snapshot again.
            this.acknowledged = '';
            throw new Error(
              'Your saved edits could not be verified. Keep this tab open and retry saving.',
            );
          }
        }
        return;
      }
    } catch (error) {
      this.publish({
        phase: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Your document could not be saved. Retry saving.',
      });
      throw error;
    }
  }
  private async work() {
    if (!this.uploaded) {
      this.publish({ phase: 'uploading', error: undefined });
      this.uploadName ||= this.latest!.name;
      await uploadWorkspace(this.id, this.bytes, this.uploadName);
      this.uploaded = true;
    }
    while (this.active) {
      if (this.actor && this.actor !== this.claimedActor) {
        const actor = this.actor;
        await claimWorkspace(this.id);
        this.claimedActor = actor;
        this.publish({ expiresAt: null });
      }
      const target = this.job || { ...this.latest!, writeId: crypto.randomUUID() };
      if (target.key === this.acknowledged) {
        this.publish({ phase: 'saved', error: undefined });
        return;
      }
      this.publish({ phase: 'saving', error: undefined });
      this.job = target;
      const result = await saveWorkspace(
        this.id,
        this.revision,
        target.name,
        target.snapshot,
        target.writeId,
      );
      this.job = null;
      this.revision = result.revision;
      this.acknowledged = target.key;
      this.publish({
        phase: target.key === this.latest!.key ? 'saved' : 'pending',
        revision: this.revision,
        updatedAt: result.updatedAt,
        expiresAt: result.expiresAt,
      });
    }
  }
  dispose() {
    this.active = false;
    clearTimeout(this.timer);
  }
  resume() {
    this.active = true;
    this.publish({});
    // React may reconnect effects while preserving the editor's state. Keep
    // the same document ID, confirmed revision and pending write in that case.
    if (this.latest) void this.flush().catch(() => {});
  }
}
