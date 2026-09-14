export const dashboardViews = ['overview', 'files', 'billing', 'settings', 'support'] as const;
export type DashboardView = (typeof dashboardViews)[number];
export function dashboardView(value: unknown): DashboardView {
  return dashboardViews.includes(value as DashboardView) ? (value as DashboardView) : 'overview';
}
export function displayName(metadata: Record<string, unknown> = {}) {
  for (const key of ['full_name', 'name'])
    if (typeof metadata[key] === 'string' && metadata[key].trim())
      return metadata[key].trim().slice(0, 100);
  return 'Your account';
}
