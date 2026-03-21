import { Navigate } from 'react-router-dom';

const STORAGE_KEY = 'admin_token';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  const expected = import.meta.env.VITE_ADMIN_TOKEN;

  if (!stored || !expected || stored !== expected) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
