'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ComplaintsListPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    department: '',
    category: '',
    search: '',
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    async function loadOptions() {
      const [{ data: cats }, { data: depts }] = await Promise.all([
        supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
      ]);
      setCategories(cats || []);
      setDepartments(depts || []);
    }
    loadOptions();

    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    setFilters((prev) => ({ ...prev, status, priority }));
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [filters]);

  async function loadComplaints() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.department) params.set('department', filters.department);
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`/api/complaints?${params.toString()}`);
      const data = await res.json();
      setComplaints(data.complaints || []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      department: '',
      category: '',
      search: '',
    });
  };

  const hasActiveFilters = Boolean(
    filters.status || filters.priority || filters.department || filters.category || filters.search
  );

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
    const map = { low: 'badge-low', normal: 'badge-normal', high: 'badge-high', critical: 'badge-critical' };
    return map[priority] || 'badge-normal';
  };

  const formatStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'New';
  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleDeleteComplaint = async (e, id, complaintNumber) => {
    e.stopPropagation(); // prevent navigating to detail page
    if (!window.confirm(`Are you sure you want to delete complaint ${complaintNumber}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/complaints/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setComplaints((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert('Failed to delete complaint');
      }
    } catch {
      alert('Error deleting complaint');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Complaint Case Records</h1>
          <p>Search, filter, and review all student grievances across university departments</p>
        </div>
        <Link href="/complaints/new" className="btn btn-primary btn-sm">
          New Complaint
        </Link>
      </div>

      {/* Filter Control Bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="form-input"
          placeholder="Search by student, roll no, or text..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          style={{ minWidth: '240px' }}
        />
        <select
          className="form-select"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="under_review">Under Review</option>
          <option value="routed">Routed</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          className="form-select"
          value={filters.priority}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <select
          className="form-select"
          value={filters.department}
          onChange={(e) => handleFilterChange('department', e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={resetFilters}
            style={{ color: 'var(--priority-critical)' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Complaints Table */}
      {loading ? (
        <div className="loading-page" style={{ minHeight: '260px' }}>
          <div className="spinner spinner-lg"></div>
          <div className="loading-text">Loading case records...</div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No complaints found</h3>
            <p>
              {hasActiveFilters
                ? 'No cases match your active filters. Try adjusting search criteria or resetting filters.'
                : 'No cases recorded yet. Log your first complaint to start triaging.'}
            </p>
            <div className="flex gap-sm" style={{ marginTop: '16px' }}>
              {hasActiveFilters && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
                  Reset Filters
                </button>
              )}
              <Link href="/complaints/new" className="btn btn-primary btn-sm">
                New Complaint
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px', padding: '0 4px' }}>
            <span className="text-xs text-muted">Showing {complaints.length} complaint case{complaints.length === 1 ? '' : 's'}</span>
          </div>
          <div className="table-container">
            <table className="table table-clickable">
              <thead>
                <tr>
                  <th>Case #</th>
                  <th>Student</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Logged Date</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/complaints/${c.id}`)}>
                    <td style={{ fontWeight: 600, color: 'var(--text-accent)', fontSize: '0.8rem' }}>
                      {c.complaint_number}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.student_name}</div>
                      {c.student_id && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.student_id}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {c.ai_category?.name || c.final_category?.name || '—'}
                    </td>
                    <td>
                      <span className={`badge ${getPriorityBadge(c.final_priority || c.ai_priority)}`}>
                        {c.final_priority || c.ai_priority || 'pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {c.final_dept?.name || c.ai_department?.name || '—'}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(c.status)}`}>
                        {formatStatus(c.status)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(c.created_at)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444', padding: '3px 8px', fontSize: '0.75rem' }}
                        onClick={(e) => handleDeleteComplaint(e, c.id, c.complaint_number)}
                        title="Delete complaint"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
