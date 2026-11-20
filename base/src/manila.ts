// Display helpers in Manila time. The server is the source of truth for every rule;
// these only format what it returns.
import { useEffect, useState } from 'react';

const TZ = 'Asia/Manila';
export const fmtTime = (d: Date | string) => new Date(d).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
export const fmtDay = (d: Date | string) => new Date(d).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' });
export const fmtShortDay = (date: string) => new Date(`${date}T12:00:00+08:00`).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', day: 'numeric' });
export const fmtHours = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

/** A ticking clock, offset to match the server so the display agrees with the rules. */
export function useNow(serverNow?: string, everyMs = 15_000) {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { if (serverNow) setOffset(Date.parse(serverNow) - Date.now()); }, [serverNow]);
  useEffect(() => {
    const tick = () => setNow(new Date(Date.now() + offset));
    tick();
    const id = setInterval(tick, everyMs);
    return () => clearInterval(id);
  }, [offset, everyMs]);
  return now;
}
