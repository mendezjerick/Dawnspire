import { useState, type FormEvent } from 'react';
import { Download, Trash2, Plus, X } from 'lucide-react';
import { api, ApiError, type User } from './api';
import { TimePage } from './TimePage';
import { fmtHours, fmtShortDay } from './manila';
import type { GridDay, Entry } from './time-types';

// HH:MM in Manila for an ISO instant, and back.
const toHm = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });
// An end time of 00:00 means the following midnight (the end of the day), not its start.
const endHm = (date: string, hm: string) => fromHm(date, hm === '00:00' ? '24:00' : hm);
const fromHm = (date: string, hm: string) => (hm === '24:00' ? new Date(Date.parse(`${date}T00:00:00+08:00`) + 86_400_000) : new Date(`${date}T${hm}:00+08:00`)).toISOString();

export function Attendance({ user }: { user: User }) {
  const [edit, setEdit] = useState<{ id: number; name: string; day: GridDay } | null>(null);
  const [version, setVersion] = useState(0);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);

  return (
    <>
      <TimePage key={version} user={user} title="Attendance" hrMode onEditDay={(id, name, day) => setEdit({ id, name, day })} />
      {edit && <DayEditor key={`${edit.id}-${edit.day.date}-${version}`} target={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); setVersion(v => v + 1); }} />}
      <section className="at-export">
        <h2 className="ov-h2">Export</h2>
        <label className="field"><span>From</span><input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /></label>
        <label className="field"><span>To</span><input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></label>
        <a className="btn btn-quiet" href={`/api/hr/export.csv?from=${from}&to=${to}`} download><Download size={16} />Download CSV</a>
        <p className="hint">One row per person per day: status, regular hours, overtime hours, flags.</p>
      </section>
    </>
  );
}

function DayEditor({ target, onClose, onSaved }: { target: { id: number; name: string; day: GridDay }; onClose: () => void; onSaved: () => void }) {
  const { day } = target;
  const [rows, setRows] = useState(() => (day.entries ?? []).map(e => ({ e, start: toHm(e.startAt), end: e.endAt ? toHm(e.endAt) : '' })));
  const [add, setAdd] = useState({ kind: 'regular', start: '08:00', end: '17:00' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); onSaved(); } catch (e) { setError((e as ApiError).message); } finally { setBusy(false); }
  }
  const saveRow = (e: Entry, start: string, end: string) => run(() => api(`/hr/entries/${e.id}`, { method: 'PATCH', body: { startAt: fromHm(day.date, start), ...(end ? { endAt: endHm(day.date, end) } : {}) } }));
  const removeRow = (e: Entry) => { if (confirm('Remove this bar? This is logged.')) void run(() => api(`/hr/entries/${e.id}`, { method: 'DELETE' })); };
  const addRow = (ev: FormEvent) => { ev.preventDefault(); void run(() => api('/hr/entries', { body: { userId: target.id, kind: add.kind, startAt: fromHm(day.date, add.start), endAt: endHm(day.date, add.end) } })); };
  const setStatus = (status: string | null) => run(() => api('/hr/status', { method: 'PUT', body: { userId: target.id, date: day.date, status } }));

  return (
    <section className="tm-detail at-editor" aria-labelledby="ed-h">
      <header><h2 id="ed-h" className="ov-h2">{target.name} · {fmtShortDay(day.date)}</h2><button onClick={onClose} aria-label="Close editor"><X size={18} /></button></header>
      <div className="at-status">
        <span>Day status</span>
        {(['none', 'unavailable', 'sick'] as const).map(s => (
          <button key={s} className={`btn btn-quiet${(day.status ?? 'none') === s ? ' on' : ''}`} aria-pressed={(day.status ?? 'none') === s} disabled={busy} onClick={() => setStatus(s === 'none' ? null : s)}>
            {s === 'none' ? 'None' : s === 'sick' ? 'Sick' : 'Unavailable'}</button>
        ))}
      </div>
      {rows.length === 0 ? <p className="hint">No bars recorded on this day.</p> : (
        <ul className="at-rows">
          {rows.map((r, i) => (
            <li key={r.e.id}>
              <span className={`state-sq ${r.e.kind === 'overtime' ? 'overtime' : 'in'}`} /><b>{r.e.kind === 'overtime' ? 'Overtime' : 'Regular'}</b>
              <input type="time" aria-label="Start" value={r.start} onChange={ev => setRows(rs => rs.map((x, j) => j === i ? { ...x, start: ev.target.value } : x))} />
              <span>–</span>
              <input type="time" aria-label="End" value={r.end} onChange={ev => setRows(rs => rs.map((x, j) => j === i ? { ...x, end: ev.target.value } : x))} />
              {r.e.endedBy === 'auto' && <em>{r.e.kind === 'overtime' ? 'no time-out' : 'auto 5:00 PM'}</em>}
              <button className="btn btn-quiet" disabled={busy || (r.start === toHm(r.e.startAt) && r.end === (r.e.endAt ? toHm(r.e.endAt) : ''))} onClick={() => saveRow(r.e, r.start, r.end)}>Save</button>
              <button className="at-icon" aria-label="Remove bar" disabled={busy} onClick={() => removeRow(r.e)}><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      <form className="at-add" onSubmit={addRow}>
        <select aria-label="Type" value={add.kind} onChange={e => setAdd({ ...add, kind: e.target.value })}><option value="regular">Regular</option><option value="overtime">Overtime</option></select>
        <input type="time" aria-label="Start" value={add.start} onChange={e => setAdd({ ...add, start: e.target.value })} required />
        <span>–</span>
        <input type="time" aria-label="End" value={add.end} onChange={e => setAdd({ ...add, end: e.target.value })} required />
        <button className="btn btn-quiet" disabled={busy}><Plus size={16} />Add bar</button>
      </form>
      <div role="alert">{error && <p className="error-text">{error}</p>}</div>
      <p className="tm-detail-tot">Counted: regular {fmtHours(day.regularMs)} · overtime {fmtHours(day.overtimeMs)}. Times are Manila time; every change is logged.</p>
    </section>
  );
}

export function InboxPage() {
  return (
    <>
      <header className="page-head"><div><h1 className="display page-title">Inbox<span>.</span></h1><div className="page-sub">Messages for HR will collect here.</div></div></header>
      <div className="pp-empty">
        <h2 className="ov-h2">Not connected yet</h2>
        <p className="hint">Inquiries from the public site currently go straight to dawnspire.office@gmail.com. Once the site’s contact form is connected to Base, new messages will appear here as well.</p>
      </div>
    </>
  );
}
