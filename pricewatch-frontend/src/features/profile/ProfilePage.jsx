import { useAuth } from '../../context/AuthContext.jsx';
import { PageHeader } from '../../components/common/Common.jsx';
import { dateTime, initials } from '../../utils/format.js';

export default function ProfilePage() {
  const { user } = useAuth();

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="stack">
      <PageHeader eyebrow="Account" title="Profile" subtitle="Your account details." />
      <div className="glass card profile">
        <div className="avatar big">{initials(user.name)}</div>
        <div className="kv grid three">
          <div><span>Name</span><b>{user.name}</b></div>
          <div><span>Email</span><b>{user.email}</b></div>
          <div><span>Member since</span><b>{formatDate(user.createdAt)}</b></div>
        </div>
      </div>
    </div>
  );
}
