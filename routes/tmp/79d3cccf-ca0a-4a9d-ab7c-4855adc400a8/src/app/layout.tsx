import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <ClerkProvider frontendApi="your-clerk-frontend-api">
      <div className="flex">
        <aside className="bg-blue-900 text-white w-64">
          <nav>
            <ul>
              <li>Dashboard</li>
              <li>Products</li>
              <li>Orders</li>
              <li>Customers</li>
              <li>Analytics</li>
            </ul>
          </nav>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </ClerkProvider>
  );
};

export default Layout;