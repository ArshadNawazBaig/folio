'use client';
import { useEffect, useRef, useState } from 'react';
import { WorkspaceSync, type SyncStatus } from '@/lib/workspace-sync';
import type { WorkspaceRecord, WorkspaceSnapshot } from '@/lib/workspace-types';
export function useWorkspaceSync(
  bytes: Uint8Array | null,
  name: string,
  snapshot: WorkspaceSnapshot,
  restored: WorkspaceRecord | null,
  userId?: string,
) {
  const sync = useRef<WorkspaceSync | null>(null);
  const source = useRef<{ bytes: Uint8Array; restoredId?: string } | null>(null);
  const [status, setStatus] = useState<SyncStatus>({ phase: 'pending', revision: 0 });
  // Restoration and the byte array are replaced together when a different PDF is opened.
  const latest = useRef({ name, snapshot, userId });
  useEffect(() => {
    latest.current = { name, snapshot, userId };
  }, [name, snapshot, userId]);
  useEffect(() => {
    if (!bytes) return;
    const initial = latest.current;
    if (source.current?.bytes !== bytes || source.current?.restoredId !== restored?.id) {
      sync.current?.dispose();
      const id = restored?.id || crypto.randomUUID();
      source.current = { bytes, restoredId: restored?.id };
      sync.current = new WorkspaceSync(
        id,
        bytes,
        (value) => {
          if (value.phase === 'saved') {
            const url = new URL(window.location.href);
            if (url.pathname === '/workspace' && url.searchParams.get('cloud') !== id)
              window.history.replaceState(null, '', `/workspace?cloud=${id}`);
          }
          setStatus(value);
        },
        restored
          ? {
              revision: restored.revision,
              name: restored.name,
              snapshot: restored.snapshot,
              updatedAt: restored.updatedAt,
              expiresAt: restored.expiresAt,
            }
          : undefined,
      );
    }
    const engine = sync.current!;
    engine.update(initial.name, initial.snapshot);
    engine.setActor(initial.userId || '');
    engine.resume();
    const online = () => void engine.flush().catch(() => {});
    window.addEventListener('online', online);
    return () => {
      engine.dispose();
      window.removeEventListener('online', online);
    };
  }, [bytes, restored]);
  useEffect(() => {
    sync.current?.update(name, snapshot);
  }, [name, snapshot]);
  useEffect(() => {
    sync.current?.setActor(userId || '');
  }, [userId]);
  return {
    ...status,
    flush: async (current?: { name: string; snapshot: WorkspaceSnapshot }) => {
      const engine = sync.current;
      try {
        if (!engine) throw new Error('Saving is not ready yet. Please try again.');
        // A manual save must include changes committed by the focused input,
        // even if the background debounce has not run yet.
        const value = current || latest.current;
        engine.update(value.name, value.snapshot);
        await engine.flush(true);
      } catch (error) {
        if (sync.current === engine)
          setStatus((previous) => ({
            ...previous,
            phase: 'error',
            error: error instanceof Error ? error.message : 'Your document could not be saved.',
          }));
        throw error;
      }
    },
  };
}
