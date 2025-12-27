
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Inbox } from './components/Inbox';
import { Contacts } from './components/Contacts';
import { Campaigns } from './components/Campaigns';
import { Settings } from './components/Settings';
import { Flows } from './components/Flows';
import { Billing } from './components/Billing';
import { Automation } from './components/Automation';

// Admin Components
import { AdminDashboard } from './components/AdminDashboard';
import { AdminUsers } from './components/AdminUsers';
import { AdminPlans } from './components/AdminPlans';
import { AdminWebhooks } from './components/AdminWebhooks';
import { AdminAudit } from './components/AdminAudit';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Client Portal */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="automation" element={<Automation />} />
          <Route path="flows" element={<Flows />} />
          <Route path="settings" element={<Settings />} />
          <Route path="billing" element={<Billing />} />
        </Route>

        {/* Admin Portal */}
        <Route path="/admin" element={<AdminLayout />}>
           <Route path="dashboard" element={<AdminDashboard />} />
           <Route path="users" element={<AdminUsers />} />
           <Route path="plans" element={<AdminPlans />} />
           <Route path="webhooks" element={<AdminWebhooks />} />
           <Route path="audit" element={<AdminAudit />} />
           {/* Fallback to dashboard */}
           <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
          
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
