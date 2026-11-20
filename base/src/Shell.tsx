import { useEffect, useState, type ReactNode } from 'react';
import { Home, CalendarDays, UserRound, UsersRound, ClipboardList, Inbox, LayoutTemplate, ShieldCheck, LogOut, type LucideIcon } from 'lucide-react';
import { BrandLogo } from '@site/BrandLogo';
import type { Role, User } from './api';
import './shell.css';

export type Page = 'overview' | 'time' | 'account' | 'members' | 'attendance' | 'inbox' | 'site' | 'hr-accounts';
type NavItem = { page: Page; label: string; icon: LucideIcon };

const NAV: Record<Role, NavItem[]> = {
  member: [
    { page: 'overview', label: 'Overview', icon: Home },
    { page: 'time', label: 'Time', icon: CalendarDays },
    { page: 'account', label: 'Account', icon: UserRound },
  ],
  hr: [
    { page: 'overview', label: 'Overview', icon: Home },
    { page: 'time', label: 'Time', icon: CalendarDays },
    { page: 'members', label: 'Members', icon: UsersRound },
    { page: 'attendance', label: 'Attendance', icon: ClipboardList },
    { page: 'inbox', label: 'Inbox', icon: Inbox },
    { page: 'account', label: 'Account', icon: UserRound },
  ],
  admin: [
    { page: 'site', label: 'Site', icon: LayoutTemplate },
    { page: 'hr-accounts', label: 'HR', icon: ShieldCheck },
    { page: 'account', label: 'Account', icon: UserRound },
  ],
};

export const homePage = (role: Role): Page => NAV[role][0].page;

/** Hash-based page state: #/time, #/members … falls back to the role's home page. */
export function usePage(role: Role): [Page, (p: Page) => void] {
  const read = () => {
    const p = location.hash.replace(/^#\/?/, '') as Page;
    return NAV[role].some(n => n.page === p) ? p : homePage(role);
  };
  const [page, setPage] = useState<Page>(read);
  useEffect(() => {
    const on = () => setPage(read());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  });
  return [page, (p: Page) => { location.hash = `/${p}`; }];
}

export function Shell({ user, page, go, onSignOut, children }: { user: User; page: Page; go: (p: Page) => void; onSignOut: () => void; children: ReactNode }) {
  return (
    <div className="shell">
      <main className="shell-main" id="main">{children}</main>
      <nav className="rail" aria-label="Base">
        <a className="rail-brand" href="#/" aria-label="Base home" onClick={e => { e.preventDefault(); go(homePage(user.role)); }}>
          <BrandLogo lockup={false} />
          <span>BASE</span>
        </a>
        <ul className="rail-nav">
          {NAV[user.role].map(({ page: p, label, icon: Icon }) => (
            <li key={p}>
              <a href={`#/${p}`} aria-current={page === p ? 'page' : undefined}><Icon size={20} strokeWidth={1.6} /><span>{label}</span></a>
            </li>
          ))}
        </ul>
        <div className="rail-foot">
          <span className="rail-who" title={user.displayName}>{user.displayName.split(' ')[0]}</span>
          <button className="rail-signout" onClick={onSignOut}><LogOut size={18} strokeWidth={1.6} /><span>Sign out</span></button>
        </div>
      </nav>
    </div>
  );
}

/** Section heading in the site's voice: condensed uppercase with the signal full stop. */
export function PageHead({ title, aside, children }: { title: string; aside?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1 className="display page-title">{title}<span>.</span></h1>
        {children && <div className="page-sub">{children}</div>}
      </div>
      {aside}
    </header>
  );
}
