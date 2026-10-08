import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardService, notificationService } from '../services/index.js';
import { BRAND } from '../constants/index.js';
import { initials } from '../utils/format.js';

const workspace = [
  ['/', 'Dashboard', '◈'], ['/monitors', 'My Monitors', '◫'], ['/monitors/new', 'Create Monitor', '＋'],
  ['/history', 'History', '↘'], ['/notifications', 'Notifications', '♢'],
];
const account = [['/profile', 'Profile', '◉']];

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">{BRAND.name[0]}</div>
      <div className="brand-name">{BRAND.name.slice(0, 3)}<span>{BRAND.name[3]}</span>{BRAND.name.slice(4)}</div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const unreadQ = useQuery({ queryKey: ['unread'], queryFn: () => notificationService.list({ limit: 1, unread: true }), refetchInterval: 60000 });
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: dashboardService.summary, refetchInterval: 30000 });
  const unread = unreadQ.data?.meta?.unread || 0;

  const link = ([to, label, icon]) => (
    <NavLink key={to} to={to} end={to === '/' || to === '/monitors'} className={({ isActive }) => (isActive ? 'active' : '')}>
      <span className="nav-icon">{icon}</span>{label}
      {label === 'Notifications' && unread > 0 && <span className="count">{unread}</span>}
    </NavLink>
  );

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand />
        <div className="nav-label">Workspace</div>
        <nav className="nav">{workspace.map(link)}</nav>
        <div className="nav-label spaced">Account</div>
        <nav className="nav">{account.map(link)}</nav>

        <div className="sidebar-bottom">
          {dash.data && (
            <div className="plan-card">
              <small>Monitoring</small>
              <strong>{dash.data.counts.Running} active monitor{dash.data.counts.Running === 1 ? '' : 's'}</strong>
              <p>{dash.data.counts.total} total · {dash.data.counts.Paused} paused</p>
            </div>
          )}
          <div className="user">
            <div className="avatar">{initials(user?.name)}</div>
            <div className="user-text"><strong>{user?.name}</strong><span>{user?.email}</span></div>
          </div>
          <button className="btn btn-block" onClick={async () => { await logout(); nav('/login'); }}>Logout</button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <main className="main">
        <div className="mobilebar">
          <button className="icon-button" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <Brand />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
