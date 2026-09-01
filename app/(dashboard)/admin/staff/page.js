'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function StaffManagementPage() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'staff', department_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: staffData }, { data: deptData }] = await Promise.all([
      supabase
        .from('profiles')
        .select(`
          *,
          department:departments(name)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
    ]);
    setStaff(staffData || []);
    setDepartments(deptData || []);
    setLoading(false);
  }

  const handleCreateStaff = async () => {
    if (!form.email || !form.password || !form.full_name) {
      setError('Email, password, and full name are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create staff account.');
        return;
      }

      setSuccess('Staff account created!');
      setTimeout(() => setSuccess(''), 3000);
      setShowModal(false);
      setForm({ email: '', password: '', full_name: '', role: 'staff', department_id: '' });
      await loadData();
    } catch {
      setError('Failed to create staff account.');
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (profileId, newRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId);
    if (!error) await loadData();
  };

  const updateDepartment = async (profileId, deptId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ department_id: deptId || null })
      .eq('id', profileId);
    if (!error) await loadData();
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg"></div>
        <div className="loading-text">Loading staff...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Staff Management</h1>
          <p>Manage staff accounts, roles, and department assignments</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); }}>
          Add Staff
        </button>
      </div>

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', fontSize: '0.85rem', color: '#6ee7b7' }}>
          {success}
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{s.full_name || 'Unknown'}</div>
                </td>
                <td>
                  <select
                    className="form-select"
                    value={s.role || 'staff'}
                    onChange={(e) => updateRole(s.id, e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', minWidth: '120px' }}
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="department_staff">Dept. Staff</option>
                  </select>
                </td>
                <td>
                  <select
                    className="form-select"
                    value={s.department_id || ''}
                    onChange={(e) => updateDepartment(s.id, e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', minWidth: '130px' }}
                  >
                    <option value="">— None —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className={`badge ${s.is_active ? 'badge-resolved' : 'badge-closed'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="text-sm text-muted">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Staff Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Staff Member</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>X</button>
            </div>
            <div className="modal-body">
              {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="staff@university.edu"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="staff">Staff</option>
                    <option value="department_staff">Department Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                    <option value="">— None —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateStaff} disabled={saving}>
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
