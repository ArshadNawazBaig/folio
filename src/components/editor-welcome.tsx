'use client';

import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  FolderOpen,
  Layers,
  PenLine,
  ShieldCheck,
  TextCursorInput,
} from 'lucide-react';
import { Logo } from './logo';
import { UploadArea } from './upload';
import { useUiLocale, useUiTranslation } from './ui-language';
import { localizedHref } from '@/lib/i18n/translate';
import { signInHref } from '@/lib/auth-navigation';
import s from './editor-welcome.module.css';

export function EditorWelcomeHeader() {
  const locale = useUiLocale();
  const tr = useUiTranslation();
  const href = (path: string) => localizedHref(locale, path);
  return (
    <header className={`editor-header ${s.header}`}>
      <div className={s.brand}>
        <Logo light href={href('/')} label={tr('Folio home')} />
        <span>{tr('PDF workspace')}</span>
      </div>
      <nav className={s.navigation} aria-label={tr('Workspace navigation')}>
        <Link
          href={href('/tools')}
          aria-label={tr('Back to all tools')}
          title={tr('All PDF tools')}
        >
          <FileText size={18} aria-hidden="true" />
          <span>{tr('All PDF tools')}</span>
        </Link>
        <Link
          href={href('/dashboard?view=files')}
          className={s.filesLink}
          aria-label={tr('My files')}
          title={tr('My files')}
        >
          <FolderOpen size={18} aria-hidden="true" />
          <span>{tr('My files')}</span>
        </Link>
      </nav>
    </header>
  );
}

export function EditorWelcome({
  onFiles,
  onSample,
  error,
  signedIn,
  cloudRequested,
}: {
  onFiles: (files: File[]) => void;
  onSample: () => void;
  error: string;
  signedIn: boolean;
  cloudRequested: boolean;
}) {
  const tr = useUiTranslation();

  const locale = useUiLocale();
  return (
    <div className={`editor-empty ${s.welcome}`}>
      <section className={s.hero} aria-labelledby="workspace-welcome-heading">
        <div className={s.container}>
          <span className={s.eyebrow}>{tr('YOUR PDF WORKSPACE')}</span>
          <h1 id="workspace-welcome-heading">
            {tr('Your PDF.')}
            <br />
            <em>{tr('Your finishing touches.')}</em>
          </h1>
          <p>{tr('A few small edits. A document that’s ready for what’s next.')}</p>
        </div>
      </section>

      <div className={`${s.container} ${s.content}`}>
        <div className={s.choices}>
          <section className={s.uploadCard} aria-labelledby="workspace-upload-heading">
            <div className={s.cardHeading}>
              <span className={s.step}>01</span>
              <div>
                <h2 id="workspace-upload-heading">{tr('Start with your PDF.')}</h2>
                <p>{tr('Add a PDF to open your workspace.')}</p>
              </div>
            </div>
            {cloudRequested && !signedIn && (
              <Link
                className={`text-link ${s.cloudLink}`}
                href={signInHref(localizedHref(locale, '/dashboard?view=files'))}
              >
                {tr('Sign in to open your cloud files')} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
            <UploadArea onFiles={onFiles} />
            {error && (
              <p className="error-message" role="alert">
                {tr(error)}
              </p>
            )}
            <p className={s.sessionNote}>
              <ShieldCheck size={17} aria-hidden="true" />
              {signedIn
                ? tr('Pick up your work later from My files.')
                : tr('Guest files expire after 24 hours. Sign in to keep them.')}
            </p>
          </section>

          <section className={s.sampleCard} aria-labelledby="workspace-sample-heading">
            <span className={s.sampleLabel}>{tr('TAKE A LOOK AROUND')}</span>
            <h2 id="workspace-sample-heading">{tr('A little practice space.')}</h2>
            <p>{tr('Get a feel for the editor with a sample you can make your own.')}</p>
            <div className={s.sampleDocument}>
              <div className={s.samplePage} aria-hidden="true">
                <span>{tr('STUDIO NORTH')}</span>
                <strong>
                  {tr('A place to')}
                  <br />
                  {tr('make your own.')}
                </strong>
                <div className={s.sampleArt}>
                  <i />
                  <b />
                </div>
                <div className={s.sampleLines} />
              </div>
              <div>
                <strong>{tr('Studio North')}</strong>
                <span>{tr('Design proposal')}</span>
                <small>{tr('PDF · 3 pages')}</small>
              </div>
            </div>
            <button type="button" className="button secondary" onClick={onSample}>
              {tr('Try a sample document')} <ArrowRight size={17} aria-hidden="true" />
            </button>
          </section>
        </div>

        <section className={s.features} aria-label={tr('What you can do in your workspace')}>
          <div>
            <TextCursorInput size={21} aria-hidden="true" />
            <div>
              <h3>{tr('Find the right words.')}</h3>
              <p>{tr('Edit text and add your notes.')}</p>
            </div>
          </div>
          <div>
            <PenLine size={21} aria-hidden="true" />
            <div>
              <h3>{tr('Make it official.')}</h3>
              <p>{tr('Fill in forms and add a signature.')}</p>
            </div>
          </div>
          <div>
            <Layers size={21} aria-hidden="true" />
            <div>
              <h3>{tr('Put it all in order.')}</h3>
              <p>{tr('Arrange pages, then download.')}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
