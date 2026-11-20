import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { BrandLogo } from '@site/BrandLogo';
import { api, ApiError, type User } from './api';
import './login.css';

/** Required after signing in with a temporary password; also reachable from Account later. */
export function ChangePassword({ user, onDone, onSignOut, required }: { user: User; onDone: () => void; onSignOut: () => void; required: boolean }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mismatch = confirm.length > 0 && confirm !== next;
  const short = next.length > 0 && next.length < 8;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setError('Your new password needs at least 8 characters.');
    if (next !== confirm) return setError('The two new passwords do not match.');
    setBusy(true); setError(null);
    try { await api('/auth/password', { body: { current, next } }); onDone(); }
    catch (err) { setError((err as ApiError).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="login">
      <main className="login-main">
        <section className="login-panel" aria-labelledby="pw-title">
          <BrandLogo className="login-lockup" />
          <h1 id="pw-title" className="display login-title">New password<span>.</span></h1>
          <p className="login-lede">
            {required ? `Welcome, ${user.displayName}. Replace the temporary password you were given with one only you know.` : 'Choose a new password for your account.'}
          </p>
          <form className="login-form" onSubmit={submit} noValidate>
            <label className="field"><span>{required ? 'Temporary password' : 'Current password'}</span>
              <input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required /></label>
            <label className="field"><span>New password</span>
              <input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} aria-invalid={short} aria-describedby="pw-rule" required />
              <small id="pw-rule" className={short ? 'error-text' : 'hint'}>At least 8 characters.</small></label>
            <label className="field"><span>Repeat new password</span>
              <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} aria-invalid={mismatch} required />
              {mismatch && <small className="error-text">Doesn't match the new password.</small>}</label>
            <div className="login-error" role="alert">{error && <p className="error-text">{error}</p>}</div>
            <button className="btn btn-primary login-submit" disabled={busy || !current || next.length < 8 || next !== confirm}>
              {busy ? 'Saving…' : 'Save password'} <ArrowRight size={18} />
            </button>
          </form>
          <p className="hint login-help"><button className="link-btn" onClick={onSignOut}>Sign out instead</button></p>
        </section>
      </main>
      <nav className="login-rail" aria-label="Dawnspire"><BrandLogo lockup={false} className="rail-mark" /></nav>
    </div>
  );
}
