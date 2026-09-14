import Link from 'next/link';
import {
  MousePointer2,
  Type,
  Highlighter,
  Signature,
  Undo2,
  Redo2,
  ChevronDown,
  Plus,
  Minus,
  ArrowUpRight,
  Check,
  MoreHorizontal,
  PanelLeft,
} from 'lucide-react';
export function Architecture({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 500 350"
      fill="none"
      role="img"
      aria-label="Original illustration of a warm stone house with an arched doorway and an olive tree"
    >
      <path fill="#cdd8c8" d="M0 0h500v350H0z" />
      <path fill="#ddd7be" d="M0 277h500v73H0z" />
      <path fill="#bdc9b8" d="m500 0-41 276H318L380 0z" />
      <path fill="#bfa17f" d="M89 48h309v270H89z" />
      <path fill="#e7d5b6" d="M114 48h224v270H114z" />
      <path fill="#efdfc2" d="M114 48h16v270h-16z" />
      <path fill="#f1e2c6" d="M104 39h247v13H104z" />
      <path fill="#556550" d="M164 318V175a57 57 0 0 1 114 0v143H164Z" />
      <path stroke="#baaf8f" strokeWidth="4" d="M221 120v198M164 226h114" />
      <path fill="#a88e70" d="M79 318h335v10H79z" />
      <path fill="#cfb895" d="M67 328h359v9H67z" />
      <path fill="#bcaa8b" d="M53 337h386v13H53z" />
      <path stroke="#626b49" strokeWidth="4" d="m432 305-3-145m1 63 26-34m-27 58-27-31" />
      <ellipse cx="429" cy="148" rx="30" ry="61" fill="#798764" />
      <ellipse cx="406" cy="184" rx="25" ry="43" fill="#6d7d5b" />
      <ellipse cx="455" cy="174" rx="23" ry="45" fill="#63734f" />
      <path fill="#b09271" d="M409 282h44l-6 38h-32l-6-38Z" />
      <path fill="#3e4a3b" opacity=".08" d="m398 50 57 270H338V50z" />
    </svg>
  );
}
export function PreviewPaper({ mini = false }: { mini?: boolean }) {
  return (
    <div className={`preview-paper ${mini ? 'mini-paper' : ''}`}>
      <div className="paper-brand">
        STUDIO NORTH<span>↗</span>
      </div>
      <p className="paper-eyebrow">SPACES FOR A SLOWER LIFE</p>
      <div className="paper-title">
        A place to
        <br />
        make your own.
      </div>
      <Architecture className="paper-art" />
      <p className="paper-caption">A considered approach to the everyday.</p>
      <div className="paper-footer">
        <span>RESIDENTIAL DESIGN PROPOSAL</span>
        <span>01 / 03</span>
      </div>
    </div>
  );
}
export function EditorPreview() {
  return (
    <div className="editor-showcase">
      <div className="showcase-note">
        <span className="note-line" />A little room for your next big idea.
      </div>
      <div className="mini-editor">
        <div className="mini-titlebar">
          <span className="mini-file-icon">F</span>
          <span>Studio North — Proposal.pdf</span>
          <span className="mini-saved">
            <Check size={12} />
            Sample document
          </span>
          <MoreHorizontal size={15} />
        </div>
        <div className="mini-toolbar">
          <div>
            <Link href="/workspace?sample=proposal" aria-label="Try the selection tool">
              <MousePointer2 size={15} />
            </Link>
            <Link
              className="active"
              href="/workspace?sample=proposal&mode=text"
              aria-label="Try adding text"
            >
              <Type size={15} />
            </Link>
            <Link href="/workspace?sample=proposal&mode=highlight" aria-label="Try highlighting">
              <Highlighter size={15} />
            </Link>
            <Link href="/workspace?sample=proposal&mode=signature" aria-label="Try signing">
              <Signature size={17} />
            </Link>
            <i />
            <Undo2 size={14} />
            <Redo2 size={14} />
          </div>
          <Link href="/workspace?sample=proposal" className="mini-export">
            Open sample <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="mini-editor-body">
          <aside className="mini-thumbnails">
            <PanelLeft size={13} />
            <div className="mini-thumb selected">
              <PreviewPaper mini />
            </div>
            <span>1</span>
            {[2, 3].map((n) => (
              <div key={n} className="mini-thumb-wrap">
                <div className="mini-thumb lined-thumb">
                  <span />
                  <b />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <span>{n}</span>
              </div>
            ))}
          </aside>
          <div className="mini-canvas">
            <PreviewPaper />
            <div className="selection-outline">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="floating-text-tool">
              <span>DM Serif Display</span>
              <ChevronDown size={10} />
              <i />
              <span>32</span>
              <span className="text-tool-color" />
            </div>
            <div className="mini-zoom">
              <Minus size={11} />
              <span>75%</span>
              <Plus size={11} />
            </div>
          </div>
        </div>
      </div>
      <div className="showcase-bottom">
        <span>
          <span className="live-dot" />
          Big possibilities. Small learning curve.
        </span>
        <Link href="/workspace?sample=proposal">
          Take a look inside <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}
