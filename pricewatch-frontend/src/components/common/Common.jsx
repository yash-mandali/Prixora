import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/index.js';
import { shortName } from '../../utils/format.js';

export const Spinner = ({ full }) => (
  <div className={full ? 'center-screen' : 'center-block'}><div className="spinner" aria-label="Loading" /></div>
);

const TONE = {
  running: 'green', success: 'green', paused: 'orange', skipped: 'orange', pending: 'blue', started: 'blue',
  completed: 'accent', failed: 'red', timeout: 'red', expired: 'gray', cancelled: 'gray',
};
export const StatusBadge = ({ status }) => (
  <span className={`pill ${TONE[String(status).toLowerCase()] || 'gray'}`}>● {status}</span>
);

export function NotificationBell() {
  const { data } = useQuery({ queryKey: ['unread'], queryFn: () => notificationService.list({ limit: 1, unread: true }), refetchInterval: 60000 });
  const unread = data?.meta?.unread || 0;
  return (
    <Link to="/notifications" className="icon-button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
      {unread > 0 && <span className="notification-dot" />}
    </Link>
  );
}

export const PageHeader = ({ eyebrow, title, subtitle, children }) => (
  <header className="page-head">
    <div className="page-head-text">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </div>
    <div className="top-actions">{children}<NotificationBell /></div>
  </header>
);

export function ProductCell({ task, link }) {
  const [broken, setBroken] = useState(false);
  const name = task.productName || task.websiteDomain;
  const inner = (
    <div className="product">
      <div className="product-img">
        {task.productImageUrl && !broken
          ? <img src={task.productImageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
          : <span>{name[0]?.toUpperCase()}</span>}
      </div>
      <div className="product-text">
        <strong title={name}>{shortName(name)}</strong>
        <span>{task.websiteDomain}</span>
      </div>
    </div>
  );
  return link ? <Link to={`/monitors/${task.id}`} className="plain">{inner}</Link> : inner;
}

export const EmptyState = ({ title, hint, children }) => (
  <div className="empty glass"><div className="empty-icon">◎</div><h3>{title}</h3>{hint && <p>{hint}</p>}{children}</div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="empty glass error"><div className="empty-icon">!</div><h3>Couldn't load data</h3><p>{message}</p>{onRetry && <button className="btn" onClick={onRetry}>Retry</button>}</div>
);

export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>← Previous</button>
      <span>Page {meta.page} of {meta.totalPages} · {meta.total} total</span>
      <button className="btn btn-sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Next →</button>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3><p>{message}</p>
        <div className="row end wrap">
          <button className="btn" onClick={onCancel}>Back</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export const StatCard = ({ label, value, icon, foot, tone }) => (
  <div className={`stat glass ${tone || ''}`}>
    <div className="stat-head"><span className="stat-label">{label}</span><span className="stat-icon">{icon}</span></div>
    <div className="stat-value">{value}</div>
    {foot && <div className="stat-foot">{foot}</div>}
  </div>
);
