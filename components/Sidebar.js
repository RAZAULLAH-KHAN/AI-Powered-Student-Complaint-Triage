'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Sidebar() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({ new: 0, high: 0 });
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profileData) setProfile(profileData);
      }
    }

    async function loadStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (data?.stats) {
          setStats({
            new: data.stats.new || 0,
            high: (data.stats.high || 0) + (data.stats.critical || 0),
          });
        }
      } catch {
        // fallback
      }
    }

    loadUser();
    loadStats();
  }, [pathname]);

  const toggleCollapse = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    const layout = document.querySelector('.app-layout');
    if (layout) {
      if (nextState) {
        layout.classList.add('sidebar-collapsed');
      } else {
        layout.classList.remove('sidebar-collapsed');
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    {
      section: 'Main',
      links: [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/complaints', label: 'All Complaints', badge: stats.new > 0 ? stats.new : null },
        { href: '/complaints/new', label: 'New Complaint' },
      ],
    },
    {
      section: 'Management',
      links: [
        { href: '/admin/departments', label: 'Departments' },
        { href: '/admin/categories', label: 'Categories' },
        ...(profile?.role === 'admin'
          ? [{ href: '/admin/staff', label: 'Staff Management' }]
          : []),
      ],
    },
  ];

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Top Navbar Header (GitHub / Vercel style) */}
      <header className="top-navbar">
        <div className="flex items-center gap-sm">
          <button
            type="button"
            className="desktop-toggle-btn"
            onClick={toggleCollapse}
            title={collapsed ? 'Open sidebar menu' : 'Collapse sidebar menu'}
          >
            <span style={{ fontSize: '0.95rem' }}>☰</span>
            <span>{collapsed ? 'Menu' : 'Hide Menu'}</span>
          </button>

          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '8px' }}>
            Complaint Triage Assistant
          </span>
        </div>

        <div className="flex items-center gap-sm">
          <Link
            href="/submit"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.78rem', color: 'var(--primary-600)' }}
          >
            Student Portal ↗
          </Link>
          <span className="badge badge-routed" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
            {profile?.role ? profile.role.toUpperCase() : 'STAFF'}
          </span>
        </div>
      </header>

      {/* Mobile Toggle Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? 'Close' : 'Menu'}
      </button>

      <div
        className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar ${mobileOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="sidebar-logo-text">
            Complaint Triage
            <span>Assistant</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleCollapse}
            title="Close sidebar menu"
            style={{ padding: '3px 8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}
          >
            Close ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section) => (
            <div key={section.section} className="sidebar-section">
              <div className="sidebar-section-title">{section.section}</div>
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`sidebar-link ${isActive(link.href) ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="sidebar-link-badge">{link.badge}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle />

          <div className="sidebar-user" onClick={handleLogout} title="Click to sign out">
            <div className="sidebar-user-avatar">
              {getInitials(profile?.full_name)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {profile?.full_name || user?.email || 'Staff Member'}
              </div>
              <div className="sidebar-user-role">
                {profile?.role || 'staff'} / Sign Out
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
