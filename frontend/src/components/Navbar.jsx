import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, Menu, MessageSquarePlus, ShieldCheck, X } from 'lucide-react';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../lib/format.js';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the account dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setMobileOpen(false);
    navigate('/', { replace: true });
  };

  const dashboardPath = isAdmin ? '/admin' : '/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* --- Desktop navigation --- */}
        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>

          {user && (
            <NavLink to={dashboardPath} className={linkClass}>
              {isAdmin ? 'All Complaints' : 'Dashboard'}
            </NavLink>
          )}

          {!isAdmin && (
            <NavLink to="/chat" className={linkClass}>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                New Complaint
              </span>
            </NavLink>
          )}

          {isAdmin && (
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1.5 text-xs font-semibold text-accent-700 ring-1 ring-inset ring-accent-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Administrator
            </span>
          )}
        </div>

        {/* --- Desktop account area --- */}
        <div className="hidden items-center gap-3 md:flex">
          {!user ? (
            <>
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Get started
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
                  {initials(user.name)}
                </span>
                <span className="max-w-[9rem] truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 animate-fade-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover"
                  role="menu"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      to={dashboardPath}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      role="menuitem"
                    >
                      <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                      {isAdmin ? 'Admin panel' : 'My dashboard'}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- Mobile toggle --- */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* --- Mobile drawer --- */}
      {mobileOpen && (
        <div className="animate-fade-in border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            <NavLink to="/" className={linkClass} end onClick={() => setMobileOpen(false)}>
              Home
            </NavLink>

            {user && (
              <NavLink to={dashboardPath} className={linkClass} onClick={() => setMobileOpen(false)}>
                {isAdmin ? 'All Complaints' : 'Dashboard'}
              </NavLink>
            )}

            {!isAdmin && (
              <NavLink to="/chat" className={linkClass} onClick={() => setMobileOpen(false)}>
                New Complaint
              </NavLink>
            )}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            {!user ? (
              <div className="flex flex-col gap-2">
                <Link to="/login" className="btn-secondary w-full" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
                <Link to="/register" className="btn-primary w-full" onClick={() => setMobileOpen(false)}>
                  Get started
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
                    {initials(user.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <button type="button" onClick={handleLogout} className="btn-danger w-full">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
