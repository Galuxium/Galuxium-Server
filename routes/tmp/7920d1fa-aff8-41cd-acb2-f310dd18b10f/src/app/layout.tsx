import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

interface AppProps {
  clerkApiKey: string;
}

const App: React.FC<AppProps> = ({ clerkApiKey }) => {
  return (
    <ClerkProvider frontendApi={clerkApiKey}>
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </div>
      </div>
    </ClerkProvider>
  );
};

export default App;