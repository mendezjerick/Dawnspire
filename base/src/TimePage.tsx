import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api, ApiError, type User } from './api';
import { PageHead } from './Shell';
import { fmtHours, fmtShortDay, fmtTime } from './manila';
import type { Grid, GridDay } from './time-types';
import './time.css';

type View = 'week' | 'month';
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const monthOf = (date: string) => date.slice(0, 7);
const manilaMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7);
const shiftMonth = (month: string, n: number) => { const [y, m] = month.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const isWeekend = (date: string) => { const d = new Date(`${date}T00:00:00Z`).getUTCDay(); return d === 0 || d === 6; };
const monthLabel = (month: string) => new Date(`${month}-15T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const rangeLabel = (from: string, to: string) => {
  const f = new Date(`${from}T00:00:00Z`), t = new Date(`${to}T00:00:00Z`);
  const o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  return `${f.toLocaleDateString('en-US', o)} – ${t.toLocaleDateString('en-US', o)}, ${t.getUTCFullYear()}`;
};

export function TimePage({ user, title = 'Time', hrMode = false, onEditDay }: { user: User; title?: string; hrMode?: boolean; onEditDay?: (personId: number, name: string, day: GridDay) => void }) {
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState<string | null>(null); // week start or YYYY-MM
  const [grid, setGrid] = useState<Grid | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<{ id: number; name: string; day: GridDay } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const path = view === 'month' ? `/time/grid?month=${anchor ?? manilaMonth()}` : anchor ? `/time/grid?start=${anchor}` : '/time/grid';
    try { setGrid(await api<Grid>(path)); } catch (e) { setError((e as ApiError).message); }
  }, [view, anchor]);
  useEffect(() => { void load(); }, [load]);

  const switchView = (v: View) => { setView(v); setOpen(null); setAnchor(v === 'month' ? (grid ? monthOf(grid.today) : manilaMonth()) : null); };
  const step = (n: number) => {
    if (!grid) return;
    setOpen(null);
    setAnchor(view === 'week' ? addDays(grid.from, 7 * n) : shiftMonth(anchor ?? monthOf(grid.today), n));
  };

  // Your own row first, then everyone else alphabetically.
  const people = useMemo(() => grid ? [...grid.people].sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : a.name.localeCompare(b.name))) : [], [grid, user.id]);
  const canSee = (id: number) => hrMode || user.role === 'hr' || id === user.id;

  return (
    <>
      <PageHead title={title} aside={
        <div className="date-nav">
          <button onClick={() => step(-1)} aria-label={`Previous ${view}`} disabled={!grid}><ChevronLeft size={18} /></button>
          <strong>{grid ? (view === 'week' ? rangeLabel(grid.from, grid.to) : monthLabel(anchor ?? monthOf(grid.today))) : '…'}</strong>
          <button onClick={() => step(1)} aria-label={`Next ${view}`} disabled={!grid}><ChevronRight size={18} /></button>
        </div>
      }>
        {hrMode ? 'Everyone’s attendance in Manila time. Select a day to see and correct its bars.' : 'Everyone’s day at a glance. Select one of your days to see its times.'}
      </PageHead>

      <div className="tm-bar">
        <div className="tabs" role="group" aria-label="View">
          <button aria-pressed={view === 'week'} onClick={() => switchView('week')}>Week</button>
          <button aria-pressed={view === 'month'} onClick={() => switchView('month')}>Month</button>
        </div>
        <ul className="tm-legend">
          <li><span className="state-sq in" />Worked</li><li><span className="state-sq overtime" />Overtime</li>
          <li><span className="state-sq unavailable" />Unavailable</li><li><span className="state-sq sick" />Sick</li>
          <li><span className="tm-flag-key" />Overtime with no time-out</li>
        </ul>
      </div>

      {error && <p className="notice error" role="alert">{error}</p>}
      {!grid ? <div className="skeleton" style={{ height: 320 }} /> : people.length === 0 ? <p className="notice">No members yet.</p> : (
        <div className="tm-scroll">
          <table className={`tm-grid ${view}`}>
            <thead>
              <tr>
                <th scope="col" className="tm-name-h">Member</th>
                {grid.days.map(d => (
                  <th scope="col" key={d} className={`${d === grid.today ? 'today' : ''} ${isWeekend(d) ? 'weekend' : ''}`}>
                    {view === 'week' ? fmtShortDay(d) : Number(d.slice(8))}
                  </th>
                ))}
                {view === 'week' && <th scope="col" className="tm-total-h">Total</th>}
              </tr>
            </thead>
            <tbody>
              {people.map(p => {
                const total = p.days.reduce((s, d) => s + d.regularMs + d.overtimeMs, 0);
                const ot = p.days.reduce((s, d) => s + d.overtimeMs, 0);
                return (
                  <tr key={p.id} className={p.id === user.id ? 'me' : ''}>
                    <th scope="row" className="tm-name">{p.name}{p.id === user.id && <small>You</small>}</th>
                    {p.days.map(d => (
                      <td key={d.date} className={`${d.date === grid.today ? 'today' : ''} ${isWeekend(d.date) ? 'weekend' : ''}`}>
                        <DayCell day={d} view={view} future={d.date > grid.today}
                          onOpen={canSee(p.id) ? () => { setOpen({ id: p.id, name: p.name, day: d }); onEditDay?.(p.id, p.name, d); } : undefined} />
                      </td>
                    ))}
                    {view === 'week' && <td className="tm-total"><b>{fmtHours(total)}</b>{ot > 0 && <small>{fmtHours(ot)} OT</small>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && !onEditDay && (
        <section className="tm-detail" aria-live="polite">
          <header><h2 className="ov-h2">{open.name} · {fmtShortDay(open.day.date)}</h2><button onClick={() => setOpen(null)} aria-label="Close day detail"><X size={18} /></button></header>
          {open.day.status ? <p>Marked <b>{open.day.status}</b> for the whole day.</p> : !open.day.entries?.length ? <p className="hint">No time recorded.</p> : (
            <ul className="tm-entries">
              {open.day.entries.map(e => (
                <li key={e.id}><span className={`state-sq ${e.kind === 'overtime' ? 'overtime' : 'in'}`} />
                  <b>{e.kind === 'overtime' ? 'Overtime' : 'Regular'}</b> {fmtTime(e.startAt)} – {e.endAt ? fmtTime(e.endAt) : 'now'}
                  {e.endedBy === 'auto' && <em>{e.kind === 'overtime' ? 'ended at midnight' : 'auto time-out at 5:00 PM'}</em>}
                  {e.endedBy === 'hr' && <em>corrected by HR</em>}
                </li>
              ))}
            </ul>
          )}
          <p className="tm-detail-tot">Regular {fmtHours(open.day.regularMs)} · Overtime {fmtHours(open.day.overtimeMs)}</p>
        </section>
      )}
    </>
  );
}

function DayCell({ day, view, future, onOpen }: { day: GridDay; view: View; future: boolean; onOpen?: () => void }) {
  const flagged = day.flags.length > 0;
  const label = day.status ? (day.status === 'sick' ? 'Sick' : 'Unavailable') : day.worked ? fmtHours(day.regularMs + day.overtimeMs) : '';
  const cls = `tm-cell ${day.status ?? (day.worked ? (day.regularMs === 0 && day.overtimeMs > 0 ? 'overtime' : 'worked') : future ? 'future' : 'empty')}${flagged ? ' flagged' : ''}`;
  const inner = view === 'week'
    ? <>{label && <span className="tm-cell-main">{label}</span>}{day.overtimeMs > 0 && !day.status && <span className="tm-cell-ot">{fmtHours(day.overtimeMs)} OT</span>}</>
    : <span className="sr-only">{label || 'No time'}</span>;
  return onOpen
    ? <button className={cls} onClick={onOpen} title={label || undefined}>{inner}</button>
    : <span className={cls} title={label || undefined}>{inner}</span>;
}
