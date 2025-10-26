import React from 'react';

interface Revenue {
  daily: number;
  monthly: number;
  yearly: number;
}

interface User {
  total: number;
  active: number;
  inactive: number;
}

interface Log {
  total: number;
  success: number;
  error: number;
}

interface AdminDashboardProps {
  revenue: Revenue;
  users: User;
  logs: Log;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ revenue, users, logs }) => {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div>
        <h2>Revenue</h2>
        <p>Daily: ${revenue.daily}</p>
        <p>Monthly: ${revenue.monthly}</p>
        <p>Yearly: ${revenue.yearly}</p>
      </div>
      <div>
        <h2>Users</h2>
        <p>Total: {users.total}</p>
        <p>Active: {users.active}</p>
        <p>Inactive: {users.inactive}</p>
      </div>
      <div>
        <h2>Logs</h2>
        <p>Total: {logs.total}</p>
        <p>Success: {logs.success}</p>
        <p>Error: {logs.error}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;