import { useEffect, useState } from 'react';
import { defaultContent, type SiteContent } from './content';
import { asset } from './asset';

// Where Base lives. Local dev defaults; set VITE_BASE_API / VITE_BASE_ORIGIN for dawnspire.cc builds.
// In production the site only talks to Base when VITE_BASE_API is set (none on GitHub Pages: built-in content is used).
const BASE_API = (import.meta.env.VITE_BASE_API as string | undefined) ?? (import.meta.env.DEV ? 'http://127.0.0.1:5175' : undefined);
const PREVIEW_ORIGINS = ((import.meta.env.VITE_BASE_ORIGIN as string | undefined) ?? 'http://localhost:5174,http://127.0.0.1:5174').split(',');

export const isPreview = new URLSearchParams(location.search).has('preview') && window.parent !== window;

type Section = keyof SiteContent;
const SECTIONS: Section[] = ['projects', 'media', 'timeline', 'personnel'];

/** Uploaded images live on Base; site images live in this site's public folder (which may sit under a subpath). */
function resolveUploads<T>(value: T): T {
  return JSON.parse(JSON.stringify(value), (_k, v) => {
    if (typeof v !== 'string') return v;
    if (v.startsWith('/uploads/')) return BASE_API ? `${BASE_API}${v}` : v;
    if (v.startsWith('/assets/') || v.startsWith('/brand/')) return asset(v);
    return v;
  });
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
  const [content, setContent] = useState<SiteContent>(() => resolveUploads(defaultContent));

  useEffect(() => {
    if (!BASE_API) return;
    const ctl = new AbortController();
    fetch(`${BASE_API}/api/public/content`, { signal: ctl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data?.sections) setContent(c => merge(c, data.sections)); })
      .catch(() => { /* Base unreachable: keep the built-in content */ });
    return () => ctl.abort();
  }, []);

  useEffect(() => {
    if (!isPreview) return;
    // The editor shows the desktop preview scaled down; wheel scrolling is scaled to match so it moves at a normal visual speed.
    let scale = 1;
    const onMessage = (e: MessageEvent) => {
      if (!PREVIEW_ORIGINS.includes(e.origin)) return;
      const msg = e.data as { type?: string; section?: string; data?: unknown; target?: string };
      if (msg?.type === 'dawnspire-preview' && msg.section && SECTIONS.includes(msg.section as Section) && Array.isArray(msg.data)) {
        setContent(c => merge(c, { [msg.section!]: msg.data }));
      }
      if (msg?.type === 'dawnspire-scroll' && typeof msg.target === 'string') {
        document.getElementById(msg.target)?.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
      if (msg?.type === 'dawnspire-scale' && typeof (msg as { scale?: unknown }).scale === 'number') {
        scale = Math.min(1, Math.max(0.2, (msg as { scale: number }).scale));
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (scale >= 0.99 || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const scroller = (e.target as Element | null)?.closest?.('.timeline-scroll, dialog');
      if (scroller) return; // leave inner scrollers alone
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
      window.scrollBy({ top: (e.deltaY * unit) / scale, behavior: 'instant' });
    };
    addEventListener('wheel', onWheel, { passive: false });
    document.documentElement.classList.add('in-preview');
    addEventListener('message', onMessage);
    for (const origin of PREVIEW_ORIGINS) window.parent.postMessage({ type: 'dawnspire-preview-ready' }, origin);
    return () => { removeEventListener('message', onMessage); removeEventListener('wheel', onWheel); };
  }, []);

  return content;
}
