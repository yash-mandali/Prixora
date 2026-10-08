import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/index.js';
import { EmptyState, ErrorState, PageHeader, ProductCell, Spinner, StatCard, StatusBadge } from '../../components/common/Common.jsx';
import { errorMessage, greeting, money, timeAgo, timeUntil } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardService.summary, refetchInterval: 30000 });
  const header = (
    <PageHeader eyebrow="Price intelligence" title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`} subtitle="Here's what's happening across your monitored products.">
      <Link className="btn btn-primary" to="/monitors/new">+ Add monitor</Link>
    </PageHeader>
  );
  if (isLoading) return <div className="stack">{header}<Spinner /></div>;
  if (error) return <div className="stack">{header}<ErrorState message={errorMessage(error)} onRetry={refetch} /></div>;

  const c = data.counts;
  if (c.total === 0) return (
    <div className="stack">{header}
      <EmptyState title="No monitors yet" hint="Create your first monitor to start tracking a product price."><Link className="btn btn-primary" to="/monitors/new">Create monitor</Link></EmptyState>
    </div>
  );
  return (
    <div className="stack">
      {header}
      <section className="stats">
        <StatCard label="Active monitors" icon="◎" value={c.Running} foot={<><span className="good">{c.Pending} pending</span> · {c.Paused} paused</>} />
        <StatCard label="Total monitors" icon="◫" value={c.total} foot={`${c.Completed} completed · ${c.Expired} expired`} />
        <StatCard label="Unread alerts" icon="♢" value={data.unreadAlerts} foot={data.unreadAlerts ? <Link to="/notifications">Review alerts →</Link> : 'All caught up'} />
        <StatCard label="Needs attention" icon="!" value={c.Failed} tone={c.Failed ? 'danger' : ''} foot={c.Failed ? 'Failed monitors' : <span className="good">Everything healthy</span>} />
      </section>

      <section className="split">
        <div className="glass card flush">
          <div className="card-header pad"><div><div className="card-title">Recently checked</div><div className="card-subtitle">Latest successful price checks</div></div><Link to="/history" className="btn btn-sm">View all</Link></div>
          {data.recentlyChecked.length === 0 ? <p className="muted pad">No checks have completed yet.</p> : (
            <div className="table-wrap"><table className="rtable">
              <thead><tr><th>Product</th><th>Current price</th><th>Checked</th><th>Status</th></tr></thead>
              <tbody>{data.recentlyChecked.map((t) => (
                <tr key={t.id}>
                  <td className="cell-product"><ProductCell task={t} link /></td>
                  <td data-label="Current price"><span className="price">{money(t.lastKnownPrice, t.currency)}</span></td>
                  <td data-label="Checked" className="muted">{timeAgo(t.lastCheckedAt)}</td>
                  <td data-label="Status"><StatusBadge status={t.status} /></td>
                </tr>))}</tbody>
            </table></div>)}
        </div>

        <div className="glass card">
          <div className="card-header"><div><div className="card-title">Upcoming checks</div><div className="card-subtitle">Next scheduled runs</div></div></div>
          {data.upcomingChecks.length === 0 ? <p className="muted">No running monitors.</p> : data.upcomingChecks.map((t) => (
            <Link key={t.id} to={`/monitors/${t.id}`} className="worker plain">
              <span className="status-dot" />
              <div className="worker-info"><strong>{t.productName || t.websiteDomain}</strong><span>{t.websiteDomain}</span></div>
              <span className="worker-time">{timeUntil(t.nextCheckAt)}</span>
            </Link>))}
        </div>
      </section>

      <section className="glass card">
        <div className="card-header"><div><div className="card-title">Recent alerts</div><div className="card-subtitle">Triggered price conditions</div></div><Link to="/notifications" className="btn btn-sm">All alerts</Link></div>
        {data.recentAlerts.length === 0 ? <p className="muted">No alerts yet.</p> : data.recentAlerts.map((n) => (
          <Link key={n.id} to={`/monitors/${n.taskId}`} className="activity plain">
            <div className="activity-icon">↓</div>
            <div className="activity-text"><strong>{n.title}</strong><span>{n.isRead ? 'Read' : 'New'} · {timeAgo(n.createdAt)}</span></div>
          </Link>))}
      </section>
    </div>
  );
}
