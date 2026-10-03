'use client';
import { useUiTranslation } from '@/components/ui-language';

import { Menu } from '@base-ui/react/menu';
import {
  Hand,
  Undo2,
  Redo2,
  Type,
  SquareDashedText,
  Eraser,
  Highlighter,
  Pencil,
  ImagePlus,
  Circle,
  X,
  Check,
  Signature,
  MessageSquare,
  Link2,
  Grid2X2,
  PanelsTopLeft,
  Files,
  Copy,
  ClipboardPaste,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import type { EditorMode } from '@/lib/types';

export type { EditorMode } from '@/lib/types';
type Action = { label: string; onClick: () => void; disabled?: boolean };
type ToolProps = {
  label: string;
  accessibleLabel?: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

function ToolButton({ label, accessibleLabel, icon: Icon, active, ...props }: ToolProps) {
  const tr = useUiTranslation();

  return (
    <button
      type="button"
      className={`editor-tool ${active ? 'active' : ''}`}
      aria-label={tr(accessibleLabel || label)}
      aria-pressed={active}
      title={tr(accessibleLabel || label)}
      {...props}
    >
      <Icon size={23} strokeWidth={1.65} />
      <span>{tr(label)}</span>
    </button>
  );
}

function ToolMenu({
  label,
  icon: Icon,
  actions,
  onClick,
  active,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  actions: Action[];
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const tr = useUiTranslation();

  return (
    <Menu.Root>
      <div className={`editor-tool-menu ${active ? 'active' : ''}`}>
        {onClick && (
          <ToolButton
            label={label}
            icon={Icon}
            onClick={onClick}
            active={active}
            disabled={disabled}
          />
        )}
        <Menu.Trigger
          className={onClick ? 'editor-tool-chevron' : 'editor-tool'}
          aria-label={onClick ? tr('{value0} options', { value0: label }) : label}
          title={onClick ? tr('{value0} options', { value0: label }) : label}
          disabled={disabled}
        >
          {onClick ? (
            <ChevronDown size={13} />
          ) : (
            <>
              <Icon size={23} strokeWidth={1.65} />
              <span>
                {label} <ChevronDown size={12} />
              </span>
            </>
          )}
        </Menu.Trigger>
      </div>
      <Menu.Portal>
        <Menu.Positioner
          className="editor-menu-positioner"
          align="start"
          sideOffset={8}
          collisionPadding={12}
        >
          <Menu.Popup className="editor-menu-popup">
            {actions.map((action) => (
              <Menu.Item
                className="editor-menu-item"
                key={tr(action.label)}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {tr(action.label)}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function EditorToolbar({
  mode,
  choose,
  busy,
  canUndo,
  canRedo,
  undo,
  redo,
  copyText,
  pasteText,
  editText,
  image,
  signature,
  more,
  layout,
  manage,
}: {
  mode: EditorMode;
  choose: (mode: EditorMode) => void;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  copyText?: () => void;
  pasteText?: () => void;
  editText: () => void;
  image: () => void;
  signature: (tab: 'draw' | 'image' | 'type') => void;
  more: Action[];
  layout: Action[];
  manage: Action[];
}) {
  const tr = useUiTranslation();

  const select = (value: EditorMode) => () => choose(value);
  return (
    <div
      className="editor-toolbar"
      role="toolbar"
      aria-label={tr('PDF editing tools')}
      onKeyDown={(event) => {
        if (
          !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) ||
          event.altKey ||
          event.metaKey ||
          event.ctrlKey
        )
          return;
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
        ];
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (index < 0) return;
        event.preventDefault();
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buttons.length - 1
              : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}
    >
      <div className="editor-tool-list">
        <ToolButton
          label={tr('Move')}
          icon={Hand}
          active={mode === 'select'}
          disabled={busy}
          onClick={select('select')}
        />
        <ToolButton label={tr('Undo')} icon={Undo2} disabled={busy || !canUndo} onClick={undo} />
        <ToolButton label={tr('Redo')} icon={Redo2} disabled={busy || !canRedo} onClick={redo} />
        <ToolButton
          label={tr('Copy')}
          accessibleLabel="Copy text box"
          icon={Copy}
          disabled={busy || !copyText}
          onClick={() => copyText?.()}
        />
        <ToolButton
          label={tr('Paste')}
          accessibleLabel="Paste text box"
          icon={ClipboardPaste}
          disabled={busy || !pasteText}
          onClick={() => pasteText?.()}
        />
        <span className="toolbar-divider" />
        <ToolButton
          label={tr('Add Text')}
          accessibleLabel="Add text"
          icon={Type}
          active={mode === 'text'}
          disabled={busy}
          onClick={select('text')}
        />
        <ToolButton
          label={tr('Edit Text')}
          accessibleLabel="Edit original text"
          icon={SquareDashedText}
          active={mode === 'original-text'}
          disabled={busy}
          onClick={editText}
        />
        <ToolMenu
          label={tr('Eraser')}
          icon={Eraser}
          active={mode === 'whiteout' || mode === 'erase'}
          disabled={busy}
          onClick={select('whiteout')}
          actions={[
            { label: tr('Cover an area'), onClick: select('whiteout') },
            { label: tr('Remove added items'), onClick: select('erase') },
          ]}
        />
        <ToolButton
          label={tr('Highlight')}
          icon={Highlighter}
          active={mode === 'highlight'}
          disabled={busy}
          onClick={select('highlight')}
        />
        <ToolButton
          label={tr('Pencil')}
          icon={Pencil}
          active={mode === 'draw'}
          disabled={busy}
          onClick={select('draw')}
        />
        <ToolMenu
          label={tr('Image')}
          icon={ImagePlus}
          disabled={busy}
          onClick={image}
          actions={[{ label: tr('Upload JPG or PNG'), onClick: image }]}
        />
        <ToolMenu
          label={tr('Ellipse')}
          icon={Circle}
          active={['ellipse', 'rectangle', 'line'].includes(mode)}
          disabled={busy}
          onClick={select('ellipse')}
          actions={[
            { label: tr('Ellipse'), onClick: select('ellipse') },
            { label: tr('Rectangle'), onClick: select('rectangle') },
            { label: tr('Horizontal line'), onClick: select('line') },
          ]}
        />
        <ToolButton
          label={tr('Cross')}
          icon={X}
          active={mode === 'cross'}
          disabled={busy}
          onClick={select('cross')}
        />
        <ToolButton
          label={tr('Check')}
          icon={Check}
          active={mode === 'check'}
          disabled={busy}
          onClick={select('check')}
        />
        <ToolMenu
          label={tr('Sign')}
          icon={Signature}
          active={mode === 'signature'}
          disabled={busy}
          onClick={() => signature('draw')}
          actions={[
            { label: tr('Type a signature'), onClick: () => signature('type') },
            { label: tr('Draw a signature'), onClick: () => signature('draw') },
            { label: tr('Upload a signature image'), onClick: () => signature('image') },
          ]}
        />
        <ToolButton
          label={tr('Annotations')}
          icon={MessageSquare}
          active={mode === 'comment'}
          disabled={busy}
          onClick={select('comment')}
        />
        <ToolButton
          label={tr('Links')}
          icon={Link2}
          active={mode === 'link'}
          disabled={busy}
          onClick={select('link')}
        />
        <ToolMenu label={tr('More tools')} icon={Grid2X2} actions={more} disabled={busy} />
        <span className="toolbar-divider" />
        <ToolMenu label={tr('Page layout')} icon={PanelsTopLeft} actions={layout} disabled={busy} />
        <ToolMenu label={tr('Manage pages')} icon={Files} actions={manage} disabled={busy} />
      </div>
    </div>
  );
}
