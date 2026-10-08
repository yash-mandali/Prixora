import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/common/Common.jsx';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner full />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner full />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}
