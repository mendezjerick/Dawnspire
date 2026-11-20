import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@site/BrandLogo';
import { api, ApiError, type User } from './api';
import { fmtDay, fmtTime, useNow } from './manila';
import './login.css';

export function Login({ onSignedIn }: { onSignedIn: (u: User) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState(0);
  const now = useNow(undefined, 1000);
  const waitLeft = Math.max(0, Math.ceil((waitUntil - Date.now()) / 1000));

  useEffect(() => { if (waitUntil && waitLeft === 0) { setWaitUntil(0); setError(null); } }, [waitLeft, waitUntil]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || waitLeft) return;
    setBusy(true); setError(null);
    try {
      const { user } = await api<{ user: User }>('/auth/login', { body: { username, password } });
      onSignedIn(user);
    } catch (err) {
      const ae = err as ApiError;
      if (ae.status === 429 && ae.retryAfterMs) setWaitUntil(Date.now() + ae.retryAfterMs);
      setError(ae.message);
      setPassword('');
    } finally { setBusy(false); }
  }

  return (
    <div className="login">
      <main className="login-main">
        <section className="login-panel" aria-labelledby="login-title">
          <BrandLogo className="login-lockup" />
          <h1 id="login-title" className="display login-title">Sign in<span>.</span></h1>
          <p className="login-lede">Base is the Dawnspire workspace for members, HR and the site admin.</p>
          <form className="login-form" onSubmit={submit} noValidate>
            <label className="field">
              <span>Username</span>
              <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username}
                onChange={e => setUsername(e.target.value)} aria-invalid={!!error && !waitLeft} />
            </label>
            <label className="field">
              <span>Password</span>
              <div className="pw">
                <input name="password" type={show ? 'text' : 'password'} autoComplete="current-password" required minLength={8} value={password}
                  onChange={e => setPassword(e.target.value)} aria-invalid={!!error && !waitLeft} />
                <button type="button" className="pw-toggle" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <div className="login-error" role="alert" aria-live="assertive">
              {error && <p className="error-text">{waitLeft ? `Too many attempts. Try again in ${waitLeft} seconds.` : error}</p>}
            </div>
            <button className="btn btn-primary login-submit" disabled={busy || !username || password.length === 0 || waitLeft > 0}>
              {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={18} />
            </button>
          </form>
          <p className="hint login-help">Forgot your password? Ask HR to reset it.</p>
        </section>
        <aside className="login-clock" aria-label="Manila time">
          <p className="display login-clock-time">{fmtTime(now)}</p>
          <p className="login-clock-day">{fmtDay(now)} · Manila</p>
          <dl className="login-hours">
            <div><dt>Regular hours</dt><dd>8:00 AM – 5:00 PM</dd></div>
            <div><dt>Lunch</dt><dd>12:00 – 1:00 PM</dd></div>
            <div><dt>Overtime</dt><dd>From 5:00 PM</dd></div>
          </dl>
        </aside>
      </main>
      <nav className="login-rail" aria-label="Dawnspire"><BrandLogo lockup={false} className="rail-mark" /></nav>
    </div>
  );
}
