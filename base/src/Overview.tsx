import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, CircleSlash, Thermometer, MoonStar } from 'lucide-react';
import { api, ApiError, type User } from './api';
import { PageHead } from './Shell';
import { fmtDay, fmtHours, fmtTime, useNow } from './manila';
import { STATE_LABEL, type BoardPerson, type Today } from './time-types';
import './overview.css';

const greeting = (now: Date) => {
  const h = Number(now.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

// The day strip spans 8 AM to midnight Manila (16 hours).
const DAY_START_H = 8, DAY_SPAN_H = 16;
const pos = (iso: string, date: string) => {
  const ms = Date.parse(iso) - Date.parse(`${date}T${String(DAY_START_H).padStart(2, '0')}:00:00+08:00`);
  return Math.min(100, Math.max(0, (ms / (DAY_SPAN_H * 3_600_000)) * 100));
};

export function Overview({ user }: { user: User }) {
  const [today, setToday] = useState<Today | null>(null);
  const [board, setBoard] = useState<BoardPerson[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The page refreshes every 30s; only the clock ticks every second, so scrolling stays smooth.
  const now = useNow(today?.now, 30_000);

  const load = useCallback(async () => {
    try {
      const [t, b] = await Promise.all([api<Today>('/time/today'), api<{ people: BoardPerson[] }>('/time/board')]);
      setToday(t); setBoard(b.people); setError(null);
    } catch (e) { setError((e as ApiError).message); }
  }, []);
  useEffect(() => { void load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);
  // Re-check when 5:00 PM or midnight passes so Overtime unlocks without a reload.
  const minuteKey = Math.floor(now.getTime() / 60_000);
  useEffect(() => { if (today && (minuteKey * 60_000) % 3_600_000 === 0) void load(); }, [minuteKey, today, load]);

  async function act(key: string, path: string, body?: unknown) {
    setBusy(key); setError(null);
    try {
      setToday(await api<Today>(path, { body: body ?? {} }));
      setBoard((await api<{ people: BoardPerson[] }>('/time/board')).people);
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(null); }
  }

  const first = user.displayName.split(' ')[0];
  const t = today;
  const state = !t ? null : t.status ? t.status : t.openBar ? (t.openBar.kind === 'overtime' ? 'overtime' : 'in') : t.entries.length ? 'out' : 'not-in';
  const statusLine = !t ? '' :
    t.status ? `You're marked ${t.status} today.` :
    t.openBar ? `You're ${t.openBar.kind === 'overtime' ? 'on overtime' : 'in'} since ${fmtTime(t.openBar.startAt)}.` :
    t.entries.length ? `You timed out at ${fmtTime(t.entries[t.entries.length - 1].endAt ?? t.now)}.` : "You haven't timed in today.";

  const counts = (board ?? []).reduce<Record<string, number>>((m, p) => { const k = p.state === 'overtime' ? 'in' : p.state; m[k] = (m[k] ?? 0) + 1; return m; }, {});

  return (
    <>
      <PageHead title={`${greeting(now)}, ${first}`} aside={
        <LiveClock serverNow={today?.now} />
      }>{statusLine}</PageHead>

      {error && <p className="notice error" role="alert">{error}</p>}

      <section className="ov-actions" aria-label="Time actions" aria-busy={!t}>
        <ActionButton tone="in" icon={<LogIn size={22} />} label="Time in" sub={t?.openBar?.kind === 'regular' ? `You're in · ${fmtTime(t.openBar.startAt)}` : !t ? '' : t.actions.timeIn.enabled ? 'Regular hours 8:00–5:00' : t.actions.timeIn.reason}
          on={state === 'in'} disabled={!t || !t.actions.timeIn.enabled} busy={busy === 'in'} onClick={() => act('in', '/time/in')} />
        <ActionButton tone="out" icon={<LogOut size={22} />} label="Time out" sub={!t ? '' : t.openBar ? 'Ends your current bar' : 'Not timed in'}
          disabled={!t || !t.actions.timeOut.enabled} busy={busy === 'out'} onClick={() => act('out', '/time/out')} />
        <ActionButton tone="unavailable" icon={<CircleSlash size={22} />} label="Unavailable" sub={t?.status === 'unavailable' ? 'Marked · tap to clear' : 'Whole day'}
          on={t?.status === 'unavailable'} disabled={!t} busy={busy === 'unavailable'} onClick={() => act('unavailable', '/time/status', { status: t?.status === 'unavailable' ? null : 'unavailable' })} />
        <ActionButton tone="sick" icon={<Thermometer size={22} />} label="Sick" sub={t?.status === 'sick' ? 'Marked · tap to clear' : 'Whole day'}
          on={t?.status === 'sick'} disabled={!t} busy={busy === 'sick'} onClick={() => act('sick', '/time/status', { status: t?.status === 'sick' ? null : 'sick' })} />
        <ActionButton tone="overtime" icon={<MoonStar size={22} />} label="Overtime" sub={t?.openBar?.kind === 'overtime' ? `Since ${fmtTime(t.openBar.startAt)} · ends by midnight` : t && !t.actions.overtimeOpen ? 'Available from 5:00 PM' : !t ? '' : t.actions.overtime.enabled ? 'Counts until midnight' : t.actions.overtime.reason}
          on={state === 'overtime'} disabled={!t || !t.actions.overtime.enabled} busy={busy === 'overtime'} onClick={() => act('overtime', '/time/overtime')} />
      </section>

      <section className="ov-day" aria-labelledby="day-h">
        <div className="ov-day-head">
          <h2 id="day-h" className="ov-h2">Your day</h2>
          <dl className="ov-totals">
            <div><dt>Regular</dt><dd>{t ? fmtHours(t.totals.regularMs) : '—'}</dd></div>
            <div><dt>Overtime</dt><dd>{t ? fmtHours(t.totals.overtimeMs) : '—'}</dd></div>
            <div><dt>This week</dt><dd>{t ? fmtHours(t.totals.weekRegularMs + t.totals.weekOvertimeMs) : '—'}</dd></div>
          </dl>
        </div>
        <div className="ov-strip" role="img" aria-label={t ? `Your bars today: ${t.entries.map(e => `${e.kind} ${fmtTime(e.startAt)} to ${e.endAt ? fmtTime(e.endAt) : 'now'}`).join(', ') || 'none yet'}` : 'Loading'}>
          <span className="ov-lunch" style={{ left: '25%', width: '6.25%' }} title="Lunch 12:00–1:00, not counted" />
          <span className="ov-five" style={{ left: '56.25%' }} />
          {t?.entries.map(e => (
            <span key={e.id} className={`ov-bar ${e.kind}`} style={{ left: `${pos(e.startAt, t.date)}%`, width: `${Math.max(0.6, pos(e.endAt ?? now.toISOString(), t.date) - pos(e.startAt, t.date))}%` }} />
          ))}
          {t && <span className="ov-now" style={{ left: `${pos(now.toISOString(), t.date)}%` }} />}
          {t?.status && <span className={`ov-status ${t.status}`}>{t.status === 'sick' ? 'Sick' : 'Unavailable'} · whole day</span>}
        </div>
        <div className="ov-ticks" aria-hidden="true"><span>8 AM</span><span>10</span><span>12 PM</span><span>2</span><span>4</span><span className="em">5 PM</span><span>8</span><span>10</span><span>12 AM</span></div>
      </section>

      <section className="ov-team" aria-labelledby="team-h">
        <div className="ov-team-head">
          <h2 id="team-h" className="ov-h2">Team now</h2>
          <ul className="ov-counts">
            {(['in', 'out', 'unavailable', 'sick', 'not-in'] as const).map(k => <li key={k}><span className={`state-sq ${k}`} />{STATE_LABEL[k]} <b>{counts[k] ?? 0}</b></li>)}
          </ul>
        </div>
        {!board ? <div className="ov-rows">{[0, 1, 2].map(i => <div key={i} className="ov-row skeleton" style={{ height: 64 }} />)}</div> :
          board.length === 0 ? <p className="notice">No members yet. HR adds members from the Members page.</p> :
          <ul className="ov-rows">
            {board.map(p => (
              <li key={p.id} className={`ov-row${p.id === user.id ? ' me' : ''}`}>
                <span className="ov-name">{p.name}{p.id === user.id && <small>You</small>}</span>
                <span className={`ov-state ${p.state}`}><span className={`state-sq ${p.state}`} />{STATE_LABEL[p.state]}</span>
                <span className="ov-since">{p.since && (p.state === 'out' ? `since ${fmtTime(p.since)}` : p.state === 'in' || p.state === 'overtime' ? `since ${fmtTime(p.since)}` : '')}</span>
              </li>
            ))}
          </ul>}
      </section>
    </>
  );
}

function LiveClock({ serverNow }: { serverNow?: string }) {
  const now = useNow(serverNow, 1000);
  return (
    <div className="ov-clock" aria-label="Manila time">
      <p className="display">{fmtTime(now)}</p>
      <span>{fmtDay(now)} · Manila</span>
    </div>
  );
}

function ActionButton({ tone, icon, label, sub, on, disabled, busy, onClick }: { tone: string; icon: React.ReactNode; label: string; sub: string; on?: boolean; disabled: boolean; busy: boolean; onClick: () => void }) {
  return (
    <button className={`ov-act ${tone}${on ? ' on' : ''}`} disabled={disabled || busy} aria-pressed={on} onClick={onClick}>
      <span className="ov-act-top">{icon}{on && <span className="ov-act-dot" aria-hidden="true" />}</span>
      <span className="ov-act-label">{busy ? 'Saving…' : label}</span>
      <span className="ov-act-sub">{sub}</span>
    </button>
  );
}
