'use client';
import { useEffect, useState } from 'react';
export function SiteAnnouncement() {
  const [text, setText] = useState('');
  useEffect(() => {
    let cancelled = false;
    fetch('/api/site')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setText(data?.announcement || '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return text ? (
    <div className="site-announcement" role="status">
      {text}
    </div>
  ) : null;
}
