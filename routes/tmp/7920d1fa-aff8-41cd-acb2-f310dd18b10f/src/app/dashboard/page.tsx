// Revenue.tsx
import React from 'react';

interface RevenueProps {
  revenue: number;
}

const Revenue: React.FC<RevenueProps> = ({ revenue }) => {
  return <div>Total Revenue: ${revenue}</div>;
};

export default Revenue;

// Users.tsx
import React from 'react';

interface UsersProps {
  userCount: number;
}

const Users: React.FC<UsersProps> = ({ userCount }) => {
  return <div>Total Users: {userCount}</div>;
};

export default Users;

// Logs.tsx
import React from 'react';

interface LogsProps {
  logCount: number;
}

const Logs: React.FC<LogsProps> = ({ logCount }) => {
  return <div>Total Logs: {logCount}</div>;
};

export default Logs;

// AdminDashboard.tsx
import React from 'react';
import Revenue from './Revenue';
import Users from './Users';
import Logs from './Logs';

interface AdminDashboardProps {
  revenue: number;
  userCount: number;
  logCount: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  revenue,
  userCount,
  logCount,
}) => {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <Revenue revenue={revenue} />
      <Users userCount={userCount} />
      <Logs logCount={logCount} />
    </div>
  );
};

export default AdminDashboard;