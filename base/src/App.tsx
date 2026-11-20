import { useCallback, useEffect, useState } from 'react';
import { api, type User } from './api';
import { Login } from './Login';
import { ChangePassword } from './ChangePassword';
import { Shell, usePage, type Page } from './Shell';
import { Overview } from './Overview';
import { TimePage } from './TimePage';
import { Account } from './Account';
import { People } from './People';
import { Attendance, InboxPage } from './Attendance';
import { SiteEditor } from './SiteEditor';

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try { setUser((await api<{ user: User }>('/auth/me')).user); } catch { setUser(null); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const signOut = async () => { await api('/auth/logout', { body: {} }).catch(() => {}); location.hash = ''; setUser(null); };

  if (user === undefined) return <div className="boot" aria-busy="true" />;
  if (!user) return <Login onSignedIn={setUser} />;
  if (user.mustChangePassword) return <ChangePassword user={user} required onDone={refresh} onSignOut={signOut} />;
  return <Workspace user={user} onSignOut={signOut} />;
}

function Workspace({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [page, go] = usePage(user.role);
  return (
    <Shell user={user} page={page} go={go} onSignOut={onSignOut}>
      <PageView page={page} user={user} />
    </Shell>
  );
}

function PageView({ page, user }: { page: Page; user: User }) {
  switch (page) {
    case 'overview': return <Overview user={user} />;
    case 'time': return <TimePage user={user} />;
    case 'account': return <Account user={user} />;
    case 'members': return <People endpoint="/hr/members" title="Members" noun="Member" intro="Create member accounts, reset passwords, and deactivate people who have left. Deactivated members keep their attendance history." />;
    case 'attendance': return <Attendance user={user} />;
    case 'inbox': return <InboxPage />;
    case 'site': return <SiteEditor />;
    case 'hr-accounts': return <People endpoint="/admin/hr" title="HR accounts" noun="HR account" intro="HR accounts manage members and attendance. Create them here; each person sets their own password on first sign-in." />;
    default: return <p className="notice">This page is being built.</p>;
  }
}
