import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { monitoringService, notificationService } from '../../services/index.js';
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, Spinner, StatusBadge } from '../../components/common/Common.jsx';
import PriceChart from '../../components/charts/PriceChart.jsx';
import { intervalLabel, typeLabel } from '../../constants/index.js';
import { dateTime, errorMessage, money, shortName, timeAgo } from '../../utils/format.js';

const Field = ({ label, children }) => <div><span>{label}</span><b>{children ?? '—'}</b></div>;

export default function MonitorDetailsPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('history');
  const [hPage, setHPage] = useState(1);
  const [ePage, setEPage] = useState(1);
  const [confirm, setConfirm] = useState(null);

  const task = useQuery({ queryKey: ['monitor', id], queryFn: () => monitoringService.get(id), refetchInterval: 30000 });
  const stats = useQuery({ queryKey: ['stats', id], queryFn: () => monitoringService.statistics(id), refetchInterval: 30000 });
  const series = useQuery({ queryKey: ['series', id], queryFn: () => monitoringService.history(id, { downsample: 500, sortDir: 'asc' }), refetchInterval: 30000 });
  const history = useQuery({ queryKey: ['history', id, hPage], queryFn: () => monitoringService.history(id, { page: hPage, limit: 10 }), placeholderData: (p) => p });
  const execs = useQuery({ queryKey: ['execs', id, ePage], queryFn: () => monitoringService.executions(id, { page: ePage, limit: 10 }), enabled: tab === 'executions', placeholderData: (p) => p });
  const notifs = useQuery({ queryKey: ['task-notifs', id], queryFn: () => notificationService.list({ taskId: id, limit: 20 }), enabled: tab === 'notifications' });

  const refresh = () => qc.invalidateQueries();
  const act = useMutation({
    mutationFn: (a) => monitoringService.action(id, a),
    onSuccess: (_d, a) => { toast.success(`Monitor ${a === 'cancel' ? 'cancelled' : a + 'd'}`); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = useMutation({
    mutationFn: () => monitoringService.remove(id),
    onSuccess: () => { toast.success('Monitor deleted'); qc.removeQueries({ queryKey: ['monitor', id] }); qc.invalidateQueries({ queryKey: ['monitors'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); nav('/monitors'); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (task.isLoading) return <Spinner />;
  if (task.error) return <ErrorState message={errorMessage(task.error)} onRetry={task.refetch} />;
  const t = task.data; const s = stats.data; const c = t.currency;
  const canPause = t.status === 'Running', canResume = t.status === 'Paused';
  const canCancel = ['Pending', 'Running', 'Paused'].includes(t.status), canEdit = ['Pending', 'Paused'].includes(t.status);
  const name = t.productName || t.websiteDomain;

  return (
    <div className="stack">
      <Link to="/monitors" className="back">← Back to monitors</Link>
      <PageHeader eyebrow={t.websiteDomain} title={shortName(name, 60)}
        subtitle={<a href={t.productUrl} target="_blank" rel="noreferrer noopener" className="url">{shortName(t.productUrl, 70)} ↗</a>}>
        <StatusBadge status={t.status} />
      </PageHeader>

      <div className="action-bar">
        {canEdit && <Link className="btn" to={`/monitors/${t.id}/edit`}>Edit</Link>}
        {canPause && <button className="btn" onClick={() => act.mutate('pause')}>Pause</button>}
        {canResume && <button className="btn btn-primary" onClick={() => act.mutate('resume')}>Resume</button>}
        {canCancel && <button className="btn" onClick={() => setConfirm('cancel')}>Cancel monitor</button>}
        <button className="btn btn-danger-ghost" onClick={() => setConfirm('delete')}>Delete</button>
      </div>

      {t.lastErrorCode && ['Running', 'Failed', 'Paused'].includes(t.status) && (
        <div className="alert">Last check problem: <b>{t.lastErrorCode}</b> ({t.consecutiveFailures} consecutive failure{t.consecutiveFailures === 1 ? '' : 's'}){t.status === 'Failed' && ' — monitoring stopped.'}</div>
      )}

      <section className="stats">
        <div className="stat glass"><div className="stat-label">Current price</div><div className="stat-value">{money(t.lastKnownPrice, c)}</div><div className="stat-foot">{t.lastCheckedAt ? `Checked ${timeAgo(t.lastCheckedAt)}` : 'Not checked yet'}</div></div>
        <div className="stat glass"><div className="stat-label">Lowest recorded</div><div className="stat-value good">{money(s?.lowestPrice ?? t.lowestPrice, c)}</div></div>
        <div className="stat glass"><div className="stat-label">Highest recorded</div><div className="stat-value">{money(s?.highestPrice ?? t.highestPrice, c)}</div></div>
        <div className="stat glass"><div className="stat-label">Checks recorded</div><div className="stat-value">{s?.count ?? 0}</div>
          {s?.count > 1 && <div className="stat-foot">{money(s.totalChange, c)} ({s.totalChangePercent}%) since first</div>}</div>
      </section>

      <section className="glass card"><div className="card-header">
        <div>
          <div className="card-title">Price movement</div>
          <div className="card-subtitle">Recorded prices over time</div>
        </div>
      </div>
        {series.isLoading ? <Spinner /> : <PriceChart points={series.data?.data} task={t} />}</section>

      <section className="glass card"><div className="card-header"><div className="card-title">Monitor settings</div></div>
        <div className="kv grid three">
          <Field label="Monitoring">{typeLabel(t.monitoringType)}</Field>
          <Field label="Minimum price">{t.minimumPrice != null ? money(t.minimumPrice, c) : null}</Field>
          <Field label="Maximum price">{t.maximumPrice != null ? money(t.maximumPrice, c) : null}</Field>
          <Field label="Target price">{t.targetPrice != null ? money(t.targetPrice, c) : null}</Field>
          <Field label="Drop threshold">{t.percentageThreshold != null ? `${t.percentageThreshold}%` : null}</Field>
          <Field label="Availability">{t.productAvailability}</Field>
          <Field label="Schedule">{intervalLabel(t.intervalMinutes)}</Field>
          <Field label="Start">{dateTime(t.startDate)}</Field><Field label="End">{dateTime(t.endDate)}</Field>
          <Field label="Last successful check">{dateTime(t.lastCheckedAt)}</Field><Field label="Next check">{dateTime(t.nextCheckAt)}</Field>
        </div>
      </section>

      <div className="tabs" role="tablist">{[['history', 'Price records'], ['executions', 'Execution history'], ['notifications', 'Notifications']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === 'history' && (history.isLoading ? <Spinner /> : history.data.data.length === 0 ? <EmptyState title="No price records yet" hint="Records appear after the first successful check." /> : (
        <div className="glass card flush"><div className="table-wrap"><table className="rtable">
          <thead><tr><th>Checked</th><th>Price</th><th>Change</th><th>%</th><th>Status</th><th>Availability</th></tr></thead>
          <tbody>{history.data.data.map((h) => (
            <tr key={h.id}><td data-label="Checked">{dateTime(h.checkedAt)}</td><td data-label="Price"><span className="price">{money(h.price, h.currency)}</span></td>
              <td data-label="Change" className={h.priceDifference < 0 ? 'down' : h.priceDifference > 0 ? 'up' : ''}>{h.priceDifference != null ? money(h.priceDifference, h.currency) : '—'}</td>
              <td data-label="%">{h.percentageChange != null ? `${h.percentageChange}%` : '—'}</td><td data-label="Status">{h.priceStatus || '—'}</td><td data-label="Availability">{h.productAvailability || '—'}</td></tr>))}</tbody>
        </table></div><Pagination meta={history.data.meta} onPage={setHPage} /></div>))}

      {tab === 'executions' && (execs.isLoading ? <Spinner /> : execs.data.data.length === 0 ? <EmptyState title="No executions yet" /> : (
        <div className="glass card flush"><div className="table-wrap"><table className="rtable">
          <thead><tr><th>Started</th><th>Result</th><th>Price</th><th>Duration</th><th>Reason</th></tr></thead>
          <tbody>{execs.data.data.map((e) => (
            <tr key={e.id}><td data-label="Started">{dateTime(e.startedAt)}</td><td data-label="Result"><StatusBadge status={e.status} /></td><td data-label="Price">{money(e.price, c)}</td>
              <td data-label="Duration">{e.executionDurationMs != null ? `${(e.executionDurationMs / 1000).toFixed(1)}s` : '—'}</td><td data-label="Reason" className="reason">{e.errorMessage || e.errorCode || '—'}</td></tr>))}</tbody>
        </table></div><Pagination meta={execs.data.meta} onPage={setEPage} /></div>))}

      {tab === 'notifications' && (notifs.isLoading ? <Spinner /> : notifs.data.data.length === 0 ? <EmptyState title="No alerts for this monitor yet" /> : (
        <div className="glass card notif-list">{notifs.data.data.map((n) => (
          <div key={n.id} className="notif"><div className="activity-icon">{n.channel === 'email' ? '✉' : '↓'}</div>
            <div className="notif-body"><div className="row between"><strong>{n.title}</strong><span className="muted small nowrap">{timeAgo(n.createdAt)}</span></div><pre>{n.message}</pre></div></div>))}</div>))}

      <ConfirmDialog open={confirm === 'cancel'} title="Cancel this monitor?" message="Cancelling is permanent. No further checks will run, but your price history is kept." confirmLabel="Cancel monitor" danger
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); act.mutate('cancel'); }} />
      <ConfirmDialog open={confirm === 'delete'} title="Delete this monitor?" message="This permanently deletes the monitor along with its price history, executions and alerts." confirmLabel="Delete" danger
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); del.mutate(); }} />
    </div>
  );
}
