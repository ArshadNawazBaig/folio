import { Logo } from './logo';
import { Skeleton, SkeletonLines, LoadingLabel } from './skeleton';

export function PdfPageSkeleton() {
  return (
    <div className="pdf-page-skeleton" aria-hidden="true">
      <Skeleton width="54%" height="1.5em" />
      <SkeletonLines lines={3} />
      <Skeleton height="38%" radius={2} />
      <SkeletonLines lines={4} />
    </div>
  );
}

export function EditorContentSkeleton({
  sidebar = true,
  properties = true,
}: {
  sidebar?: boolean;
  properties?: boolean;
}) {
  return (
    <>
      <LoadingLabel>Opening your PDF workspace…</LoadingLabel>
      <div className="editor-toolbar editor-skeleton-toolbar" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i}>
            <Skeleton width={22} height={25} />
            <Skeleton width={42} height={10} />
          </div>
        ))}
      </div>
      <div
        className={`editor-body editor-skeleton-body ${sidebar ? '' : 'hide-pages'} ${properties ? '' : 'hide-properties'}`}
        aria-hidden="true"
      >
        <aside className="page-sidebar">
          <div className="sidebar-heading">
            <Skeleton width={60} height={11} />
            <span className="icon-button">
              <Skeleton width={16} height={16} />
            </span>
          </div>
          <div className="page-thumbnails">
            {[0, 1, 2].map((i) => (
              <div className="page-thumbnail" key={i}>
                <Skeleton width={86} height={121} radius={1} />
                <Skeleton width={10} height={10} />
              </div>
            ))}
          </div>
        </aside>
        <div className="editor-canvas-area">
          <div className="editor-skeleton-paper">
            <PdfPageSkeleton />
          </div>
        </div>
        <aside className="properties-sidebar">
          <div className="properties-tabs editor-skeleton-tabs">
            <Skeleton width={55} height={10} />
            <Skeleton width={32} height={10} />
            <Skeleton width={15} height={15} />
          </div>
          <div className="properties-content editor-skeleton-properties">
            <Skeleton width="65%" height={18} />
            <SkeletonLines lines={2} />
            <Skeleton height={42} radius={7} />
            <Skeleton width="45%" height={10} />
            <Skeleton height={42} radius={7} />
            <div className="editor-skeleton-colors">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} width={22} height={22} radius="50%" />
              ))}
            </div>
          </div>
        </aside>
      </div>
      <div className="editor-statusbar" aria-hidden="true">
        <Skeleton width={130} height={10} />
        <Skeleton width={80} height={10} />
        <Skeleton width={100} height={10} />
      </div>
    </>
  );
}

export function EditorSkeleton() {
  return (
    <main id="main" className="editor-app editor-route-skeleton" aria-busy="true">
      <header className="editor-header">
        <div className="editor-header-left">
          <Logo />
          <span className="header-divider" />
          <div className="editor-file-title">
            <Skeleton width={160} height={16} />
          </div>
        </div>
        <div className="editor-header-right">
          <span className="button secondary cloud-save-button">
            <Skeleton width={16} height={16} />
            <span>
              <Skeleton width={49} height={12} />
            </span>
          </span>
          <span className="button primary">
            <Skeleton width={16} height={16} />
            <span>
              <Skeleton width={86} height={12} />
            </span>
          </span>
        </div>
      </header>
      <EditorContentSkeleton />
    </main>
  );
}
