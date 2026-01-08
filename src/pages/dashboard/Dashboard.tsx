import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import MemberDashboard from './MemberDashboard';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { role } = useAuth();

  // Redirect prospects to profile page
  if (role === 'prospect') {
    return <Navigate to="/dashboard/profile" replace />;
  }

  // E-board gets admin dashboard, everyone else gets member dashboard
  if (role === 'e-board') {
    return <AdminDashboard />;
  }

  return <MemberDashboard />;
};

export default Dashboard;