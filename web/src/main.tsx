import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AdminGuard } from './components/auth/AdminGuard';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/admin/LoginPage';
import { AdminPage } from './pages/admin/AdminPage';
import { DemoPage } from './pages/demo/DemoPage';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,   // 30s — reasonable for admin data
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  // Redirect root to /admin
  { path: '/', element: <Navigate to="/admin" replace /> },

  // Admin login — public (no guard)
  { path: '/admin/login', element: <LoginPage /> },

  // Admin shell — guarded by AdminGuard
  {
    path: '/admin',
    element: (
      <AdminGuard>
        <AdminLayout />
      </AdminGuard>
    ),
    children: [
      { index: true, element: <AdminPage /> },
    ],
  },

  // Public demo feed — no auth required
  { path: '/demo', element: <DemoPage /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
