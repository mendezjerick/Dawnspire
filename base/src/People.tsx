import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Copy, Check, KeyRound, UserPlus, RefreshCw } from 'lucide-react';
import { api, ApiError } from './api';
import { PageHead } from './Shell';
import './people.css';

type Person = { id: number; username: string; displayName: string; active: boolean; mustChangePassword: boolean; createdAt: string };
type Issued = { name: string; username: string; password: string; kind: 'created' | 'reset' };

// Readable temporary passwords: no look-alike characters, 10 long.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const tempPassword = () => Array.from(crypto.getRandomValues(new Uint32Array(10)), n => ALPHABET[n % ALPHABET.length]).join('');

/** Account manager used by HR (members) and the admin (HR accounts). */
export function People({ endpoint, title, noun, intro }: { endpoint: string; title: string; noun: string; intro: string }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try { setPeople((await api<{ people: Person[] }>(endpoint)).people); } catch (e) { setError((e as ApiError).message); }
  }, [endpoint]);
  useEffect(() => { void load(); }, [load]);

  async function patch(p: Person, body: object, after?: () => void) {
    setError(null);
    try { await api(`${endpoint}/${p.id}`, { method: 'PATCH', body }); after?.(); await load(); }
    catch (e) { setError((e as ApiError).message); }
  }

  const active = people?.filter(p => p.active) ?? [];
  const inactive = people?.filter(p => !p.active) ?? [];

  return (
    <>
      <PageHead title={title} aside={<button className="btn btn-primary" onClick={() => { setAdding(a => !a); setIssued(null); }} aria-expanded={adding}><UserPlus size={18} />Add {noun.toLowerCase()}</button>}>{intro}</PageHead>
      {error && <p className="notice error" role="alert">{error}</p>}
      {issued && <IssuedCard issued={issued} noun={noun} onClose={() => setIssued(null)} />}
      {adding && <AddForm endpoint={endpoint} noun={noun} onCancel={() => setAdding(false)} onCreated={async i => { setAdding(false); setIssued(i); await load(); }} />}

      {!people ? <div className="skeleton" style={{ height: 220 }} /> : people.length === 0 ? (
        <div className="pp-empty"><h2 className="ov-h2">No {noun.toLowerCase()}s yet</h2><p className="hint">Use “Add {noun.toLowerCase()}” to create the first account. You’ll get a temporary password to pass on; they choose their own on first sign-in.</p></div>
      ) : (
        <>
          <PeopleTable rows={active} onReset={p => { const pw = tempPassword(); void patch(p, { password: pw }, () => setIssued({ name: p.displayName, username: p.username, password: pw, kind: 'reset' })); }}
            onToggle={p => { if (confirm(`Deactivate ${p.displayName}? They'll be signed out and can't sign in until reactivated. Their attendance history stays.`)) void patch(p, { active: false }); }}
            onRename={(p, name) => patch(p, { displayName: name })} />
          {inactive.length > 0 && (
            <details className="pp-inactive"><summary>Deactivated · {inactive.length}</summary>
              <PeopleTable rows={inactive} inactive onToggle={p => patch(p, { active: true })} onRename={(p, name) => patch(p, { displayName: name })} />
            </details>
          )}
        </>
      )}
    </>
  );
}

function PeopleTable({ rows, inactive, onReset, onToggle, onRename }: { rows: Person[]; inactive?: boolean; onReset?: (p: Person) => void; onToggle: (p: Person) => void; onRename: (p: Person, name: string) => void }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState('');
  return (
    <table className="pp-table">
      <thead><tr><th scope="col">Name</th><th scope="col">Username</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>
        {rows.map(p => (
          <tr key={p.id}>
            <th scope="row">
              {editing === p.id ? (
                <form className="pp-rename" onSubmit={e => { e.preventDefault(); onRename(p, name); setEditing(null); }}>
                  <input aria-label="Name" value={name} onChange={e => setName(e.target.value)} autoFocus minLength={2} maxLength={80} />
                  <button className="btn btn-primary">Save</button><button type="button" className="link-btn" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              ) : <button className="pp-name" onClick={() => { setEditing(p.id); setName(p.displayName); }} title="Rename">{p.displayName}</button>}
            </th>
            <td className="pp-user">{p.username}</td>
            <td>{inactive ? <span className="pp-tag off">Deactivated</span> : p.mustChangePassword ? <span className="pp-tag wait">Waiting for first sign-in</span> : <span className="pp-tag ok">Active</span>}</td>
            <td className="pp-actions">
              {onReset && <button className="btn btn-quiet" onClick={() => onReset(p)}><KeyRound size={16} />Reset password</button>}
              <button className="btn btn-quiet" onClick={() => onToggle(p)}>{inactive ? 'Reactivate' : 'Deactivate'}</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AddForm({ endpoint, noun, onCreated, onCancel }: { endpoint: string; noun: string; onCreated: (i: Issued) => void; onCancel: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(tempPassword);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggest = (n: string) => n.trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z0-9._-]/g, '') ?? '';

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      await api(endpoint, { body: { username, displayName, password } });
      onCreated({ name: displayName, username: username.trim().toLowerCase(), password, kind: 'created' });
    } catch (err) { setError((err as ApiError).message); }
    finally { setBusy(false); }
  }

  return (
    <form className="pp-add" onSubmit={submit}>
      <h2 className="ov-h2">New {noun.toLowerCase()}</h2>
      <div className="pp-add-grid">
        <label className="field"><span>Full name</span><input value={displayName} onChange={e => { const v = e.target.value; if (!username || username === suggest(displayName)) setUsername(suggest(v)); setDisplayName(v); }} required minLength={2} maxLength={80} autoFocus /></label>
        <label className="field"><span>Username</span><input value={username} onChange={e => setUsername(e.target.value)} required pattern="[A-Za-z0-9._-]{3,32}" autoCapitalize="none" spellCheck={false} /><small className="hint">3–32 letters, numbers, dot, dash or underscore.</small></label>
        <label className="field"><span>Temporary password</span>
          <div className="pw"><input value={password} onChange={e => setPassword(e.target.value)} required minLength={8} spellCheck={false} />
            <button type="button" className="pw-toggle" onClick={() => setPassword(tempPassword())} aria-label="Generate another password"><RefreshCw size={16} /></button></div>
          <small className="hint">They’ll replace it on first sign-in.</small></label>
      </div>
      <div role="alert">{error && <p className="error-text">{error}</p>}</div>
      <div className="pp-add-actions"><button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : `Create ${noun.toLowerCase()}`}</button><button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function IssuedCard({ issued, noun, onClose }: { issued: Issued; noun: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Base sign-in for ${issued.name}\nUsername: ${issued.username}\nTemporary password: ${issued.password}\nYou'll choose your own password after signing in.`;
  return (
    <section className="pp-issued" role="status">
      <div>
        <h2 className="ov-h2">{issued.kind === 'created' ? `${noun} created` : 'Password reset'}</h2>
        <p className="hint">Share these with {issued.name}. This is the only time the password is shown.</p>
      </div>
      <dl><div><dt>Username</dt><dd>{issued.username}</dd></div><div><dt>Temporary password</dt><dd>{issued.password}</dd></div></dl>
      <div className="pp-issued-actions">
        <button className="btn btn-primary" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked: text stays visible */ } }}>
          {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy details'}</button>
        <button className="btn btn-quiet" onClick={onClose}>Done</button>
      </div>
    </section>
  );
}
