import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, Upload, Monitor, Smartphone, ExternalLink, ChevronDown } from 'lucide-react';
import { defaultContent, type SiteContent, type Phase } from '@site/content';
import { api, ApiError } from './api';
import { PageHead } from './Shell';
import './editor.css';

type Section = keyof SiteContent;
type Item = Record<string, unknown>;
type ServerSection = { draft: Item[]; published: Item[]; draftUpdatedAt: string; publishedAt: string | null; hasUnpublished: boolean };

const SITE_ORIGIN = (import.meta.env.VITE_SITE_ORIGIN as string | undefined) ?? 'http://localhost:5173';
const SECTIONS: Array<{ key: Section; label: string; anchor: string; noun: string }> = [
  { key: 'projects', label: 'Projects', anchor: 'projects', noun: 'project' },
  { key: 'media', label: 'Media', anchor: 'media', noun: 'photo' },
  { key: 'timeline', label: 'Calendar', anchor: 'calendar', noun: 'project row' },
  { key: 'personnel', label: 'Personnel', anchor: 'personnel', noun: 'person' },
];
// Sections the site cannot render empty.
const MIN_ITEMS: Partial<Record<Section, number>> = { projects: 1, media: 1 };

type Field = { key: string; label: string; kind: 'text' | 'textarea' | 'image' | 'select' | 'list' | 'url'; options?: string[]; hint?: string; required?: boolean };
const FIELDS: Record<Exclude<Section, 'timeline'>, Field[]> = {
  projects: [
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'subtitle', label: 'Tagline', kind: 'text' },
    { key: 'type', label: 'Category', kind: 'text', hint: 'Projects with the same category share a filter tab.' },
    { key: 'status', label: 'Status', kind: 'text', hint: 'Shown in orange above the name, e.g. “In development”.' },
    { key: 'year', label: 'Year', kind: 'text' },
    { key: 'phase', label: 'Current phase', kind: 'text' },
    { key: 'description', label: 'Short description', kind: 'textarea' },
    { key: 'detail', label: 'Full description', kind: 'textarea', hint: 'Shown when a visitor opens the project.' },
    { key: 'stack', label: 'Technology', kind: 'list', hint: 'Separate with commas.' },
    { key: 'image', label: 'Image', kind: 'image', hint: 'A screenshot or product image. Without one, the project shows its name with “Coming soon”.' },
    { key: 'link', label: 'Link', kind: 'url', hint: 'Optional, e.g. a Play Store page.' },
    { key: 'note', label: 'Note under the project', kind: 'text', hint: 'Credits or a short caption; becomes the link text when a link is set.' },
  ],
  media: [
    { key: 'title', label: 'Title', kind: 'text', required: true },
    { key: 'category', label: 'Label above the title', kind: 'text' },
    { key: 'image', label: 'Photo', kind: 'image', required: true },
    { key: 'caption', label: 'Caption', kind: 'textarea' },
    { key: 'alt', label: 'Photo description', kind: 'text', hint: 'What the photo shows, for screen readers.' },
    { key: 'credit', label: 'Photo credit', kind: 'text', hint: 'e.g. “Photo: Jeruskie”.' },
  ],
  personnel: [
    { key: 'group', label: 'Group', kind: 'select', options: ['board', 'team'] },
    { key: 'name', label: 'Name', kind: 'text', required: true },
    { key: 'role', label: 'Role', kind: 'text' },
    { key: 'bio', label: 'Biography', kind: 'textarea' },
    { key: 'image', label: 'Portrait', kind: 'image', hint: 'Without one, the placeholder silhouette is shown.' },
  ],
};
const BLANK: Record<Section, () => Item> = {
  projects: () => ({ id: '', name: 'NEW PROJECT', subtitle: '', type: 'Web platforms', status: 'In development', year: String(new Date().getFullYear()), description: '', stack: [], theme: 'custom', detail: '', phase: '', note: '' }),
  media: () => ({ title: 'New photo', category: '', image: '', caption: '', alt: '', credit: '' }),
  timeline: () => ({ project: 'NEW PROJECT', kind: '', phases: [] }),
  personnel: () => ({ name: 'New person', role: '', bio: '', group: 'team' }),
};
const titleOf = (s: Section, it: Item) => String((s === 'media' ? it.title : s === 'timeline' ? it.project : it.name) ?? 'Untitled');
// Projects are numbered by position, as on the site.
const normalize = (s: Section, items: Item[]) => (s === 'projects' ? items.map((it, i) => ({ ...it, id: String(i + 1).padStart(2, '0') })) : items);

export function SiteEditor() {
  const [section, setSection] = useState<Section>('projects');
  const [drafts, setDrafts] = useState<Record<Section, Item[]> | null>(null);
  const [meta, setMeta] = useState<Partial<Record<Section, ServerSection>>>({});
  const [save, setSave] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop');
  const [open, setOpen] = useState<number | null>(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const box = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(0.5);
  const deviceRef = useRef<'desktop' | 'phone'>('desktop');
  // Tell the preview how much it is scaled so wheel scrolling feels normal.
  const postScale = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: 'dawnspire-scale', scale: deviceRef.current === 'desktop' ? scaleRef.current : 1 }, SITE_ORIGIN);
  }, []);
  // Scale the 1440px desktop preview to the panel width.
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      scaleRef.current = Math.min(1, e.contentRect.width / 1440);
      el.style.setProperty('--ed-scale', String(scaleRef.current));
      el.style.setProperty('--ed-h', `${e.contentRect.height}px`);
      postScale();
    });
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const load = useCallback(async () => {
    try {
      const { sections } = await api<{ sections: Partial<Record<Section, ServerSection>> }>('/admin/content');
      setMeta(sections);
      setDrafts(Object.fromEntries(SECTIONS.map(({ key }) => [key, (sections[key]?.draft as Item[] | undefined) ?? (defaultContent[key] as unknown as Item[])])) as Record<Section, Item[]>);
      setSave('saved');
    } catch (e) { setError((e as ApiError).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // Live preview: send drafts to the embedded public site.
  const sendPreview = useCallback((d: Record<Section, Item[]> | null, scrollTo?: string) => {
    const win = frame.current?.contentWindow;
    if (!win || !d) return;
    for (const { key } of SECTIONS) win.postMessage({ type: 'dawnspire-preview', section: key, data: d[key] }, SITE_ORIGIN);
    if (scrollTo) win.postMessage({ type: 'dawnspire-scroll', target: scrollTo }, SITE_ORIGIN);
  }, []);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.origin === SITE_ORIGIN && e.data?.type === 'dawnspire-preview-ready') { sendPreview(drafts, SECTIONS.find(s => s.key === section)!.anchor); postScale(); } };
    addEventListener('message', onMsg);
    return () => removeEventListener('message', onMsg);
  }, [drafts, section, sendPreview, postScale]);
  useEffect(() => { deviceRef.current = device; postScale(); }, [device, postScale]);
  useEffect(() => { sendPreview(drafts); }, [drafts, sendPreview]);
  useEffect(() => { sendPreview(drafts, SECTIONS.find(s => s.key === section)!.anchor); setOpen(0); }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(s: Section, items: Item[]) {
    const next = normalize(s, items);
    setDrafts(d => (d ? { ...d, [s]: next } : d));
    setSave('dirty');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setSave('saving');
      try { await api(`/admin/content/${s}`, { method: 'PUT', body: { data: next } }); setMeta(m => ({ ...m, [s]: { ...(m[s] ?? { published: [], publishedAt: null }), draft: next, draftUpdatedAt: new Date().toISOString(), hasUnpublished: true } as ServerSection })); setSave('saved'); }
      catch (e) { setSave('error'); setError((e as ApiError).message); }
    }, 900);
  }

  async function publish() {
    if (!drafts) return;
    clearTimeout(timer.current); setError(null); setSave('saving');
    try {
      await api(`/admin/content/${section}`, { method: 'PUT', body: { data: drafts[section] } });
      await api(`/admin/content/${section}/publish`, { body: {} });
      await load();
    } catch (e) { setSave('error'); setError((e as ApiError).message); }
  }
  async function discard() {
    if (!meta[section] || !confirm(`Discard unpublished changes to ${SECTIONS.find(s => s.key === section)!.label}? The site keeps what is published.`)) return;
    try { await api(`/admin/content/${section}/discard`, { body: {} }); await load(); } catch (e) { setError((e as ApiError).message); }
  }

  const items = drafts?.[section] ?? [];
  const m = meta[section];
  const managed = !!m?.publishedAt;
  const unpublished = save === 'dirty' || save === 'saving' || !!m?.hasUnpublished || !managed;
  const info = SECTIONS.find(s => s.key === section)!;
  const statusText = save === 'saving' ? 'Saving draft…' : save === 'dirty' ? 'Unsaved changes…' : save === 'error' ? 'Draft not saved' :
    !managed ? (m ? 'Draft saved · not published yet' : 'Not published from Base yet · the site shows its built-in content') : unpublished ? 'Draft saved · not published' : `Published ${new Date(m!.publishedAt!).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })}`;

  return (
    <div className="ed-page">
      <PageHead title="Site" aside={
        <div className="ed-publish">
          <span className={`ed-state ${unpublished ? 'pending' : 'live'}`} role="status">{statusText}</span>
          {m && m.hasUnpublished && <button className="btn btn-quiet" onClick={discard}>Discard changes</button>}
          <button className="btn btn-primary" onClick={publish} disabled={!drafts || save === 'saving' || (!unpublished && managed)}>Publish {info.label.toLowerCase()}</button>
        </div>
      }>Edit what dawnspire.cc shows. Changes save as a draft and appear in the preview; visitors only see them after you publish.</PageHead>
      {error && <p className="notice error" role="alert">{error}</p>}

      <div className="ed">
        <div className="ed-panel">
          <div className="tabs ed-tabs" role="tablist">
            {SECTIONS.map(s => <button key={s.key} role="tab" aria-selected={section === s.key} aria-pressed={section === s.key} onClick={() => setSection(s.key)}>{s.label}{meta[s.key]?.hasUnpublished && <span className="ed-dot" title="Unpublished changes" />}</button>)}
          </div>
          {!drafts ? <div className="skeleton" style={{ height: 300 }} /> : (
            <ol className="ed-list">
              {items.map((it, i) => (
                <li key={i} className={open === i ? 'open' : ''}>
                  <div className="ed-row">
                    <button className="ed-row-title" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                      <span className="ed-num">{String(i + 1).padStart(2, '0')}</span><span>{titleOf(section, it)}</span><ChevronDown size={16} />
                    </button>
                    <div className="ed-row-tools">
                      <button aria-label="Move up" disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; update(section, n); setOpen(i - 1); }}><ArrowUp size={16} /></button>
                      <button aria-label="Move down" disabled={i === items.length - 1} onClick={() => { const n = [...items]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; update(section, n); setOpen(i + 1); }}><ArrowDown size={16} /></button>
                      <button aria-label={`Remove ${titleOf(section, it)}`} disabled={items.length <= (MIN_ITEMS[section] ?? 0)} onClick={() => { if (confirm(`Remove “${titleOf(section, it)}”? You can discard the draft to undo before publishing.`)) { update(section, items.filter((_, j) => j !== i)); setOpen(null); } }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {open === i && (
                    <div className="ed-fields">
                      {section === 'timeline'
                        ? <TimelineFields item={it} onChange={v => update(section, items.map((x, j) => (j === i ? v : x)))} />
                        : FIELDS[section].map(f => <FieldInput key={f.key} field={f} value={it[f.key]} onChange={v => update(section, items.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} />)}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
          <button className="btn btn-quiet ed-add" disabled={!drafts} onClick={() => { update(section, [...items, BLANK[section]()]); setOpen(items.length); }}><Plus size={16} />Add {info.noun}</button>
        </div>

        <div className="ed-preview">
          <div className="ed-preview-bar">
            <span>Preview · {info.label}</span>
            <div className="tabs" role="group" aria-label="Preview size">
              <button aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}><Monitor size={14} /> Desktop</button>
              <button aria-pressed={device === 'phone'} onClick={() => setDevice('phone')}><Smartphone size={14} /> Phone</button>
            </div>
            <a href={SITE_ORIGIN} target="_blank" rel="noreferrer" className="ed-open">Open live site <ExternalLink size={13} /></a>
          </div>
          <div ref={box} className={`ed-frame ${device}`}>
            <iframe ref={frame} title="Site preview" src={`${SITE_ORIGIN}/?preview=1`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  const id = `f-${field.key}`;
  if (field.kind === 'image') return <ImageField field={field} value={String(value ?? '')} onChange={onChange} />;
  return (
    <label className="field ed-field" htmlFor={id}>
      <span>{field.label}{field.required && ' *'}</span>
      {field.kind === 'textarea' ? <textarea id={id} rows={4} value={String(value ?? '')} onChange={e => onChange(e.target.value)} />
        : field.kind === 'select' ? <select id={id} value={String(value ?? field.options![0])} onChange={e => onChange(e.target.value)}>{field.options!.map(o => <option key={o} value={o}>{o === 'board' ? 'Board of directors' : o === 'team' ? 'The team' : o}</option>)}</select>
        : field.kind === 'list' ? <input id={id} value={(value as string[] | undefined ?? []).join(', ')} onChange={e => onChange(e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
        : <input id={id} type={field.kind === 'url' ? 'url' : 'text'} value={String(value ?? '')} onChange={e => onChange(e.target.value)} required={field.required} />}
      {field.hint && <small className="hint">{field.hint}</small>}
    </label>
  );
}

function ImageField({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file: File) {
    setBusy(true); setError(null);
    const body = new FormData(); body.append('file', file);
    try {
      const res = await fetch('/api/admin/uploads', { method: 'POST', body, credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed.');
      onChange(data.url);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="field ed-field">
      <span>{field.label}{field.required && ' *'}</span>
      <div className="ed-image">
        {value ? <img src={value} alt="" /> : <div className="ed-image-empty">No image</div>}
        <div className="ed-image-actions">
          <label className="btn btn-quiet"><Upload size={16} />{busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} /></label>
          {value && !field.required && <button className="link-btn" onClick={() => onChange('')}>Remove image</button>}
        </div>
      </div>
      {error && <small className="error-text">{error}</small>}
      {field.hint && <small className="hint">{field.hint}</small>}
      <small className="hint">JPEG, PNG, WebP or GIF, up to 8 MB.</small>
    </div>
  );
}

function TimelineFields({ item, onChange }: { item: Item; onChange: (v: Item) => void }) {
  const phases = (item.phases as Phase[] | undefined) ?? [];
  const setPhase = (i: number, patch: Partial<Phase>) => onChange({ ...item, phases: phases.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  return (
    <>
      <label className="field ed-field"><span>Project *</span><input value={String(item.project ?? '')} onChange={e => onChange({ ...item, project: e.target.value })} /></label>
      <label className="field ed-field"><span>Kind</span><input value={String(item.kind ?? '')} onChange={e => onChange({ ...item, kind: e.target.value })} /><small className="hint">e.g. “Mobile application”.</small></label>
      <label className="field ed-field"><span>Deadline</span><input type="date" value={String(item.deadline ?? '')} onChange={e => onChange({ ...item, deadline: e.target.value || undefined })} /><small className="hint">Optional. Shown as a marker on the timeline.</small></label>
      <div className="ed-phases">
        <span className="ed-phases-h">Phases</span>
        {phases.length === 0 && <p className="hint">No phases: the calendar shows “Timeline to be announced”.</p>}
        {phases.map((p, i) => (
          <div key={i} className="ed-phase">
            <input aria-label="Phase name" value={p.label} onChange={e => setPhase(i, { label: e.target.value })} />
            <input aria-label="Start date" type="date" value={p.from ?? ''} onChange={e => setPhase(i, { from: e.target.value || null })} title="Leave empty for “in progress now”" />
            <input aria-label="End date" type="date" value={p.to} onChange={e => setPhase(i, { to: e.target.value })} />
            <select aria-label="Phase state" value={p.phase} onChange={e => setPhase(i, { phase: e.target.value as Phase['phase'] })}>
              <option value="planned">Planned</option><option value="active">In progress</option><option value="complete">Completed</option>
            </select>
            <button aria-label="Remove phase" onClick={() => onChange({ ...item, phases: phases.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
          </div>
        ))}
        <small className="hint">An empty start date means “in progress now”, drawn from today.</small>
        <button className="btn btn-quiet" onClick={() => onChange({ ...item, phases: [...phases, { label: 'New phase', from: new Date().toISOString().slice(0, 10), to: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10), phase: 'planned' }] })}><Plus size={15} />Add phase</button>
      </div>
    </>
  );
}
