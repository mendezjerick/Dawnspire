import { useEffect, useState } from 'react';
import { defaultContent, type SiteContent } from './content';

// Where Base lives. Local dev defaults; set VITE_BASE_API / VITE_BASE_ORIGIN for dawnspire.cc builds.
const BASE_API = (import.meta.env.VITE_BASE_API as string | undefined) ?? 'http://127.0.0.1:5175';
const PREVIEW_ORIGINS = ((import.meta.env.VITE_BASE_ORIGIN as string | undefined) ?? 'http://localhost:5174,http://127.0.0.1:5174').split(',');

export const isPreview = new URLSearchParams(location.search).has('preview') && window.parent !== window;

type Section = keyof SiteContent;
const SECTIONS: Section[] = ['projects', 'media', 'timeline', 'personnel'];

/** Uploaded images are stored by Base; make their paths absolute so the public site can load them. */
function resolveUploads<T>(value: T): T {
  return JSON.parse(JSON.stringify(value), (_k, v) => (typeof v === 'string' && v.startsWith('/uploads/') ? `${BASE_API}${v}` : v));
}

function merge(base: SiteContent, incoming: Partial<Record<string, unknown>>): SiteContent {
  const next = { ...base };
  for (const s of SECTIONS) if (Array.isArray(incoming[s])) (next as Record<Section, unknown>)[s] = resolveUploads(incoming[s]);
  return next;
}

/**
 * Site content: built-in defaults, replaced by whatever the admin has published in Base.
 * In preview mode (embedded in Base's editor) it also accepts unpublished drafts, from Base only.
 */
export function useSiteContent(): SiteContent {
  const [content, setContent] = useState<SiteContent>(defaultContent);

  useEffect(() => {
    const ctl = new AbortController();
    fetch(`${BASE_API}/api/public/content`, { signal: ctl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data?.sections) setContent(c => merge(c, data.sections)); })
      .catch(() => { /* Base unreachable: keep the built-in content */ });
    return () => ctl.abort();
  }, []);

  useEffect(() => {
    if (!isPreview) return;
    const onMessage = (e: MessageEvent) => {
      if (!PREVIEW_ORIGINS.includes(e.origin)) return;
      const msg = e.data as { type?: string; section?: string; data?: unknown; target?: string };
      if (msg?.type === 'dawnspire-preview' && msg.section && SECTIONS.includes(msg.section as Section) && Array.isArray(msg.data)) {
        setContent(c => merge(c, { [msg.section!]: msg.data }));
      }
      if (msg?.type === 'dawnspire-scroll' && typeof msg.target === 'string') {
        document.getElementById(msg.target)?.scrollIntoView({ block: 'start' });
      }
    };
    addEventListener('message', onMessage);
    for (const origin of PREVIEW_ORIGINS) window.parent.postMessage({ type: 'dawnspire-preview-ready' }, origin);
    return () => removeEventListener('message', onMessage);
  }, []);

  return content;
}
