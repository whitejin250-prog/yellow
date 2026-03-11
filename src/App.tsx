import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './Layout';
import Login from './Login';
import DocumentRequest from './DocumentRequest';
import AdminApprovals from './AdminApprovals';
import AdminStaff from './AdminStaff';
import MyInfo from './MyInfo';
import EmergencyContacts from './EmergencyContacts';
import Contracts from './Contracts';
import AdminSendContract from './AdminSendContract';
import AdminTemplates from './AdminTemplates';
import AdminStaffEdit from './AdminStaffEdit';
import AdminStaffAdd from './AdminStaffAdd';
import AdminAnnouncements from './AdminAnnouncements';
import Announcements from './Announcements';
import ExpenseRequest from './ExpenseRequest';
import AdminExpenseReports from './AdminExpenseReports';
import Dashboard from './Dashboard';
import OrgChart from './OrgChart';

const AppRoutes = () => {
  const { user } = useAuth();

  if (!user) {
    return <Routes><Route path="*" element={<Login />} /></Routes>;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/my-info" element={<MyInfo />} />
        <Route path="/request" element={<DocumentRequest />} />
        <Route path="/contacts" element={<EmergencyContacts />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/org-chart" element={<OrgChart />} />
        <Route path="/admin/approvals" element={<AdminApprovals />} />
        <Route path="/admin/staff" element={<AdminStaff />} />
        <Route path="/admin/staff/add" element={<AdminStaffAdd />} />
        <Route path="/admin/staff/edit/:id" element={<AdminStaffEdit />} />
        <Route path="/admin/send-contract" element={<AdminSendContract />} />
        <Route path="/admin/announcements" element={<AdminAnnouncements />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/expense-request" element={<ExpenseRequest />} />
        <Route path="/admin/expense-reports" element={<AdminExpenseReports />} />
        <Route path="/admin/templates" element={<AdminTemplates />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
