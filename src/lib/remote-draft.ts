import { clearCloudRecovery, readCloudRecovery, saveCloudRecovery } from './cloud-recovery';
import type { RemoteResult, RemoteTool } from './remote-types';
export async function saveRemoteDraft(result: RemoteResult) {
  return saveCloudRecovery(result.tool, result, result.expiresAt);
}
export async function readRemoteDraft(tool: RemoteTool): Promise<RemoteResult | undefined> {
  const result = await readCloudRecovery<RemoteResult>(tool);
  return result?.tool === tool &&
    result.expiresAt > Date.now() &&
    typeof result.artifact === 'string'
    ? result
    : undefined;
}
export async function clearRemoteDraft(tool: RemoteTool) {
  await clearCloudRecovery(tool);
}
