import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { notificationService } from '../../services/index.js';
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../../components/common/Common.jsx';
import { errorMessage, timeAgo } from '../../utils/format.js';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['notifications', page], queryFn: () => notificationService.list({ page, limit: 15 }) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); };
  const readOne = useMutation({ mutationFn: notificationService.markRead, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: notificationService.markAllRead, onSuccess: () => { refresh(); toast.success('All marked as read'); } });

  const header = (
    <PageHeader eyebrow="Alerts" title="Notifications" subtitle="Triggered price conditions and delivery status.">
      <button className="btn" onClick={() => readAll.mutate()} disabled={!data?.meta?.unread}>Mark all read</button>
    </PageHeader>
  );
  if (isLoading) return <div className="stack">{header}<Spinner /></div>;
  if (error) return <div className="stack">{header}<ErrorState message={errorMessage(error)} onRetry={refetch} /></div>;
  return (
    <div className="stack">
      {header}
      {data.data.length === 0 ? <EmptyState title="No notifications" hint="You'll see price alerts here." /> : (
        <div className="glass card notif-list">{data.data.map((n) => (
          <div key={n.id} className={`notif ${n.isRead ? '' : 'unread'}`} onClick={() => !n.isRead && readOne.mutate(n.id)}>
            <div className="activity-icon">{n.channel === 'email' ? '✉' : '↓'}</div>
            <div className="notif-body">
              <div className="row between"><strong>{n.title}</strong><span className="muted small nowrap">{timeAgo(n.createdAt)}</span></div>
              <pre>{n.message}</pre>
              <div className="row between wrap"><Link to={`/monitors/${n.taskId}`} onClick={(e) => e.stopPropagation()}>View monitor →</Link><span className="muted small">{n.channel === 'email' ? `Email · ${n.status}` : 'In-app'}</span></div>
            </div>
          </div>))}</div>)}
      <Pagination meta={data.meta} onPage={setPage} />
    </div>
  );
}
