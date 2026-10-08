import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import { LoginPage, RegisterPage } from './features/auth/AuthPages.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import MonitorListPage from './features/monitoring/MonitorListPage.jsx';
import MonitorFormPage from './features/monitoring/MonitorFormPage.jsx';
import MonitorDetailsPage from './features/monitoring/MonitorDetailsPage.jsx';
import NotificationsPage from './features/notifications/NotificationsPage.jsx';
import ProfilePage from './features/profile/ProfilePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/monitors" element={<MonitorListPage mode="active" />} />
          <Route path="/monitors/new" element={<MonitorFormPage />} />
          <Route path="/monitors/:id" element={<MonitorDetailsPage />} />
          <Route path="/monitors/:id/edit" element={<MonitorFormPage />} />
          <Route path="/history" element={<MonitorListPage mode="all" />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
