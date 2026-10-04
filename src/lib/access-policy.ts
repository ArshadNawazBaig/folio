/** Free launch has no expiry. Re-enabling pricing requires a coordinated release
 * with the database free_access_enabled setting (see docs/FREE-LAUNCH.md). */
export const FREE_LAUNCH = process.env.NEXT_PUBLIC_FREE_LAUNCH !== 'false';
export const LAUNCH_STORAGE_LIMIT = 1024 * 1024 * 1024;
export const LEGACY_FREE_STORAGE_LIMIT = 100 * 1024 * 1024;
export const GUEST_STORAGE_LIMIT = 100 * 1024 * 1024;
