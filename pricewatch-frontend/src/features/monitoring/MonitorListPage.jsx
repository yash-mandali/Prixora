import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { monitoringService } from '../../services/index.js';
import { EmptyState, ErrorState, PageHeader, Pagination, ProductCell, Spinner, StatusBadge } from '../../components/common/Common.jsx';
import { STATUSES, intervalLabel } from '../../constants/index.js';
import { dateTime, errorMessage, money } from '../../utils/format.js';

const targetText = (t) => {
  if (t.monitoringType === 'PriceRange') return `${money(t.minimumPrice, t.currency)} – ${money(t.maximumPrice, t.currency)}`;
  if (t.monitoringType === 'TargetPrice') return `≤ ${money(t.targetPrice, t.currency)}`;
  if (t.monitoringType === 'PercentageDrop') return `↓ ${t.percentageThreshold}%`;
  return 'Any change';
};

/** mode="active": "My Monitors" (Pending/Running/Paused). mode="all": "History" (every task, any status). */
export default function MonitorListPage({ mode = 'active' }) {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState({ sortBy: 'createdAt', sortDir: 'desc' });

  useEffect(() => { const t = setTimeout(() => { setDebounced(q); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); setStatus(''); }, [mode]);
  const params = { page, limit: 10, q: debounced || undefined, ...sort, status: status || (mode === 'active' ? 'Pending,Running,Paused' : undefined) };
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['monitors', mode, params], queryFn: () => monitoringService.list(params), placeholderData: (p) => p });

  const th = (label, key) => (
    <th className="sortable" onClick={() => { setSort((s) => ({ sortBy: key, sortDir: s.sortBy === key && s.sortDir === 'asc' ? 'desc' : 'asc' })); setPage(1); }}>
      {label}{sort.sortBy === key ? (sort.sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );

  return (
    <div className="stack">
      <PageHeader eyebrow={mode === 'active' ? 'Monitors' : 'Archive'} title={mode === 'active' ? 'My Monitors' : 'History'}
        subtitle={mode === 'active' ? 'Products you are tracking right now.' : 'Every monitor you have created, in any status.'}>
        <Link className="btn btn-primary" to="/monitors/new">+ Add monitor</Link>
      </PageHeader>

      <div className="filters">
        <input type="search" placeholder="Search products or sites…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">{mode === 'active' ? 'All active' : 'All statuses'}</option>
          {STATUSES.filter((s) => mode === 'all' || ['Pending', 'Running', 'Paused'].includes(s)).map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={`${sort.sortBy}:${sort.sortDir}`} className="only-mobile" aria-label="Sort"
          onChange={(e) => { const [sortBy, sortDir] = e.target.value.split(':'); setSort({ sortBy, sortDir }); setPage(1); }}>
          <option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option>
          <option value="productName:asc">Name A–Z</option><option value="lastKnownPrice:asc">Price low → high</option><option value="lastKnownPrice:desc">Price high → low</option>
          <option value="endDate:asc">Ending soonest</option>
        </select>
        {isFetching && <span className="muted small">Updating…</span>}
      </div>

      {isLoading ? <Spinner /> : error ? <ErrorState message={errorMessage(error)} onRetry={refetch} /> : data.data.length === 0 ? (
        <EmptyState title="No monitors found" hint={debounced || status ? 'Try changing your filters.' : 'Create a monitor to start tracking prices.'}>
          {!debounced && !status && <Link className="btn btn-primary" to="/monitors/new">Create monitor</Link>}
        </EmptyState>
      ) : (
        <div className="glass card flush table-wrap"><table className="rtable">
          <thead><tr>{th('Product', 'productName')}{th('Current price', 'lastKnownPrice')}<th>Target</th><th>Schedule</th>{th('Start', 'startDate')}{th('End', 'endDate')}{th('Last checked', 'lastCheckedAt')}{th('Status', 'status')}<th /></tr></thead>
          <tbody>{data.data.map((t) => (
            <tr key={t.id} className="clickable" onClick={() => nav(`/monitors/${t.id}`)}>
              <td className="cell-product"><ProductCell task={t} /></td>
              <td data-label="Current price"><span className="price">{money(t.lastKnownPrice, t.currency)}</span></td>
              <td data-label="Target"><span className="target">{targetText(t)}</span></td>
              <td data-label="Schedule"><span className="target">{intervalLabel(t.intervalMinutes)}</span></td>
              <td data-label="Start" className="muted">{dateTime(t.startDate)}</td>
              <td data-label="End" className="muted">{dateTime(t.endDate)}</td>
              <td data-label="Last checked" className="muted">{dateTime(t.lastCheckedAt)}</td>
              <td data-label="Status"><StatusBadge status={t.status} />{t.lastErrorCode && !['Completed', 'Cancelled', 'Expired'].includes(t.status) && <div className="small err">{t.lastErrorCode}</div>}</td>
            </tr>))}</tbody>
        </table></div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </div>
  );
}
