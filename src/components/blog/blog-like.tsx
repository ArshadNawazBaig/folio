'use client';
import { useUiTranslation } from '@/components/ui-language';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Link as LinkIcon, Check } from 'lucide-react';
import { useAccount } from '../account-provider';
import { accountFetch } from '@/lib/auth-client';
import { signInHref } from '@/lib/auth-navigation';
import s from './blog.module.css';
export function BlogLike({
  id,
  slug,
  initialCount,
}: {
  id: string;
  slug: string;
  initialCount: number;
}) {
  const tr = useUiTranslation();

  const { user, loading } = useAccount();
  const userId = user?.id;
  const [count, setCount] = useState(initialCount),
    [liked, setLiked] = useState(false),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    setLiked(false);
    setReady(false);
    setError('');
    if (loading) return;
    const load = userId ? accountFetch(`/api/blog/${id}/like`) : fetch(`/api/blog/${id}/like`);
    void load
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Likes are unavailable.');
        if (active) {
          setCount(data.count);
          setLiked(data.liked);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [id, userId, loading]);
  async function like() {
    setBusy(true);
    setError('');
    try {
      const data = await (
        await accountFetch(`/api/blog/${id}/like`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ liked: !liked }),
        })
      ).json();
      setLiked(data.liked);
      setCount(data.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('Your like could not be saved.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.engagement}>
      <div>
        <span className={s.eyebrow}>{tr('A GOOD READ?')}</span>
        <p>{tr('A little appreciation goes a long way.')}</p>
      </div>
      <div className={s.engagementActions}>
        {user ? (
          <button
            className={`${s.likeButton} ${liked ? s.liked : ''}`}
            aria-label={liked ? tr('Unlike this post') : tr('Like this post')}
            aria-pressed={liked}
            disabled={busy || !ready}
            onClick={() => void like()}
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            <span>{count}</span>
          </button>
        ) : (
          <Link
            className={s.likeButton}
            href={signInHref(`/blog/${slug}`)}
            aria-label={tr('Sign in to like this post. {value0} likes', { value0: count })}
          >
            <Heart size={18} />
            <span>{count}</span>
            <span>{tr('Like')}</span>
          </Link>
        )}
        <button
          className={s.shareButton}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setError(tr('Copy the address from your browser to share this post.'));
            }
          }}
        >
          {copied ? <Check size={17} /> : <LinkIcon size={17} />}{' '}
          {copied ? tr('Link copied') : tr('Copy link')}
        </button>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {tr(error)}
        </p>
      )}
    </div>
  );
}
