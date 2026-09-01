'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    underReview: 0,
    routed: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    high: 0,
    critical: 0,
  });
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();

      if (data.error) {
        console.error('Error loading dashboard:', data.error);
        setLoading(false);
        return;
      }

      setStats(data.stats || {
        total: 0,
        new: 0,
        underReview: 0,
        routed: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        high: 0,
        critical: 0,
      });

      setRecentComplaints(data.recentComplaints || []);
      setDepartmentStats(data.departmentStats || []);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        await loadDashboardData();
      }
    } catch (err) {
      console.error('Failed to seed data:', err);
    } finally {
      setSeeding(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      new: 'badge-new',
      under_review: 'badge-under-review',
      routed: 'badge-routed',
      in_progress: 'badge-in-progress',
      resolved: 'badge-resolved',
      closed: 'badge-closed',
    };
    return map[status] || 'badge-new';
  };

  const getPriorityBadge = (priority) => {
    const map = {
      low: 'badge-low',
      normal: 'badge-normal',
      high: 'badge-high',
      critical: 'badge-critical',
    };
    return map[priority] || 'badge-normal';
  };

  const formatStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'New';
  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg"></div>
        <div className="loading-text">Loading dashboard overview...</div>
      </div>
    );
  }

  const maxDeptCount = Math.max(...departmentStats.map((d) => d.count), 1);

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Triage Dashboard</h1>
          <p>Real-time overview of student complaint intake, routing, and operational status</p>
        </div>
        <div className="flex gap-sm">
          {stats.total === 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSeedData}
              disabled={seeding}
            >
              {seeding ? 'Generating...' : 'Load Sample Data'}
            </button>
          )}
          <Link href="/complaints/new" className="btn btn-primary btn-sm">
            New Complaint
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-label">Total Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: 'var(--status-new)' }}>{stats.new}</div>
          <div className="stat-card-label">New Intake</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: 'var(--priority-high)' }}>{stats.high + stats.critical}</div>
          <div className="stat-card-label">High / Critical</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: 'var(--status-in-progress)' }}>{stats.underReview + stats.inProgress}</div>
          <div className="stat-card-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: 'var(--status-resolved)' }}>{stats.resolved}</div>
          <div className="stat-card-label">Resolved</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Recent Complaints */}
        <div>
          <div className="flex items-center justify-between mb-md">
            <h2>Recent Intake</h2>
            <Link href="/complaints" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div className="table-container">
            {recentComplaints.length === 0 ? (
              <div className="empty-state">
                <h3>No active complaints</h3>
                <p>Start by creating a new complaint or load sample test data.</p>
                <div className="flex gap-sm" style={{ marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleSeedData} disabled={seeding}>
                    {seeding ? 'Loading...' : 'Load Sample Data'}
                  </button>
                  <Link href="/complaints/new" className="btn btn-primary btn-sm">
                    New Complaint
                  </Link>
                </div>
              </div>
            ) : (
              <table className="table table-clickable">
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Student</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentComplaints.map((c) => (
                    <tr key={c.id} onClick={() => window.location.href = `/complaints/${c.id}`}>
                      <td style={{ fontWeight: 600, color: 'var(--text-accent)', fontSize: '0.8rem' }}>
                        {c.complaint_number}
                      </td>
                      <td>{c.student_name}</td>
                      <td>
                        <span className={`badge ${getPriorityBadge(c.ai_priority)}`}>
                          {c.ai_priority || 'pending'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(c.status)}`}>
                          {formatStatus(c.status)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDate(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Department Distribution & Quick Actions */}
        <div>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>Department Load</h2>
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            {departmentStats.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <p className="text-muted">No department activity recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {departmentStats.map((dept) => (
                  <div key={dept.name}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{dept.name}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dept.count} cases</span>
                    </div>
                    <div style={{
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-full)',
                      height: '7px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(dept.count / maxDeptCount) * 100}%`,
                        background: 'var(--primary-500)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h2 style={{ marginBottom: 'var(--space-md)' }}>Quick Filters</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href="/complaints?priority=high,critical" className="btn btn-secondary w-full" style={{ justifyContent: 'space-between' }}>
              <span>High & Critical Priority</span>
              <span className="badge badge-high">{stats.high + stats.critical}</span>
            </Link>
            <Link href="/complaints?status=new" className="btn btn-secondary w-full" style={{ justifyContent: 'space-between' }}>
              <span>New Intake Awaiting Review</span>
              <span className="badge badge-new">{stats.new}</span>
            </Link>
            <Link href="/complaints?status=in_progress,routed" className="btn btn-secondary w-full" style={{ justifyContent: 'space-between' }}>
              <span>Active In Department</span>
              <span className="badge badge-in-progress">{stats.underReview + stats.inProgress + stats.routed}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
