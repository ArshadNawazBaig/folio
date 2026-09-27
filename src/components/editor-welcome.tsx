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
import s from './editor-welcome.module.css';

export function EditorWelcomeHeader() {
  return (
    <header className={`editor-header ${s.header}`}>
      <div className={s.brand}>
        <Logo light />
        <span>PDF workspace</span>
      </div>
      <nav className={s.navigation} aria-label="Workspace navigation">
        <Link href="/tools" aria-label="Back to all tools" title="All PDF tools">
          <FileText size={18} aria-hidden="true" />
          <span>All PDF tools</span>
        </Link>
        <Link
          href="/dashboard?view=files"
          className={s.filesLink}
          aria-label="My files"
          title="My files"
        >
          <FolderOpen size={18} aria-hidden="true" />
          <span>My files</span>
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
  return (
    <div className={`editor-empty ${s.welcome}`}>
      <section className={s.hero} aria-labelledby="workspace-welcome-heading">
        <div className={s.container}>
          <span className={s.eyebrow}>YOUR PDF WORKSPACE</span>
          <h1 id="workspace-welcome-heading">
            Your PDF.
            <br />
            <em>Your finishing touches.</em>
          </h1>
          <p>A few small edits. A document that’s ready for what’s next.</p>
        </div>
      </section>

      <div className={`${s.container} ${s.content}`}>
        <div className={s.choices}>
          <section className={s.uploadCard} aria-labelledby="workspace-upload-heading">
            <div className={s.cardHeading}>
              <span className={s.step}>01</span>
              <div>
                <h2 id="workspace-upload-heading">Start with your PDF.</h2>
                <p>Add a PDF to open your workspace.</p>
              </div>
            </div>
            {cloudRequested && !signedIn && (
              <Link
                className={`text-link ${s.cloudLink}`}
                href="/account?next=%2Fdashboard%3Fview%3Dfiles"
              >
                Sign in to open your cloud files <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
            <UploadArea onFiles={onFiles} />
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <p className={s.sessionNote}>
              <ShieldCheck size={17} aria-hidden="true" />
              {signedIn
                ? 'Pick up your work later from My files.'
                : 'Guest files expire after 24 hours. Sign in to keep them.'}
            </p>
          </section>

          <section className={s.sampleCard} aria-labelledby="workspace-sample-heading">
            <span className={s.sampleLabel}>TAKE A LOOK AROUND</span>
            <h2 id="workspace-sample-heading">A little practice space.</h2>
            <p>Get a feel for the editor with a sample you can make your own.</p>
            <div className={s.sampleDocument}>
              <div className={s.samplePage} aria-hidden="true">
                <span>STUDIO NORTH</span>
                <strong>
                  A place to
                  <br />
                  make your own.
                </strong>
                <div className={s.sampleArt}>
                  <i />
                  <b />
                </div>
                <div className={s.sampleLines} />
              </div>
              <div>
                <strong>Studio North</strong>
                <span>Design proposal</span>
                <small>PDF · 3 pages</small>
              </div>
            </div>
            <button type="button" className="button secondary" onClick={onSample}>
              Try a sample document <ArrowRight size={17} aria-hidden="true" />
            </button>
          </section>
        </div>

        <section className={s.features} aria-label="What you can do in your workspace">
          <div>
            <TextCursorInput size={21} aria-hidden="true" />
            <div>
              <h3>Find the right words.</h3>
              <p>Edit text and add your notes.</p>
            </div>
          </div>
          <div>
            <PenLine size={21} aria-hidden="true" />
            <div>
              <h3>Make it official.</h3>
              <p>Fill in forms and add a signature.</p>
            </div>
          </div>
          <div>
            <Layers size={21} aria-hidden="true" />
            <div>
              <h3>Put it all in order.</h3>
              <p>Arrange pages, then download.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
