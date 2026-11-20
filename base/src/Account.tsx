import { useState, type FormEvent } from 'react';
import { api, ApiError, type User } from './api';
import { PageHead } from './Shell';

const ROLE_LABEL = { admin: 'Site admin', hr: 'HR', member: 'Member' } as const;

export function Account({ user }: { user: User }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setMsg({ ok: false, text: 'The two new passwords do not match.' });
    setBusy(true); setMsg(null);
    try {
      await api('/auth/password', { body: { current, next } });
      setCurrent(''); setNext(''); setConfirm('');
      setMsg({ ok: true, text: 'Password changed. Other devices have been signed out.' });
    } catch (err) { setMsg({ ok: false, text: (err as ApiError).message }); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHead title="Account">Your sign-in details. Only HR can change your name or username.</PageHead>
      <div className="acct">
        <dl className="acct-facts">
          <div><dt>Name</dt><dd>{user.displayName}</dd></div>
          <div><dt>Username</dt><dd>{user.username}</dd></div>
          <div><dt>Role</dt><dd>{ROLE_LABEL[user.role]}</dd></div>
        </dl>
        <form className="acct-form" onSubmit={submit}>
          <h2 className="ov-h2">Change password</h2>
          <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required /></label>
          <label className="field"><span>New password</span><input type="password" autoComplete="new-password" minLength={8} value={next} onChange={e => setNext(e.target.value)} required /><small className="hint">At least 8 characters.</small></label>
          <label className="field"><span>Repeat new password</span><input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required aria-invalid={confirm.length > 0 && confirm !== next} /></label>
          <div role="status" aria-live="polite">{msg && <p className={msg.ok ? 'hint' : 'error-text'}>{msg.text}</p>}</div>
          <button className="btn btn-primary" disabled={busy || !current || next.length < 8 || next !== confirm}>{busy ? 'Saving…' : 'Save password'}</button>
        </form>
      </div>
    </>
  );
}
