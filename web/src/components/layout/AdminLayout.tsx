import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'admin_token';

const NAV_LINKS = [
  { to: '/admin/trends', label: 'Trends' },
  { to: '/admin/sources', label: 'Sources' },
  { to: '/admin/categories', label: 'Categories' },
];

export function AdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    // Per D-07: clear sessionStorage, redirect to login
    sessionStorage.removeItem(STORAGE_KEY);
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — Per D-08: dark slate-900 */}
      <aside className="w-56 bg-slate-900 flex flex-col text-white flex-shrink-0">
        <div className="px-4 py-5 border-b border-slate-700">
          <span className="text-lg font-semibold tracking-tight">Trenfy</span>
        </div>

        {/* Per D-06: Trends, Sources, Categories nav links */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Per D-07: Logout in sidebar footer */}
        <div className="px-4 py-4 border-t border-slate-700">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={handleLogout}
          >
            Log out
          </Button>
        </div>
      </aside>

      {/* Main content — Per D-08: light white/gray-50 */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
