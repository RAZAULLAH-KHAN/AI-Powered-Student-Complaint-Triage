'use client';

import { useState, useEffect } from 'react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/departments');
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setShowModal(true);
    setError('');
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setForm({ name: dept.name, description: dept.description || '' });
    setShowModal(true);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Department name is required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      if (editing) {
        const res = await fetch('/api/admin/departments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editing.id,
            name: form.name.trim(),
            description: form.description.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update department');
      } else {
        const res = await fetch('/api/admin/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create department');
      }
      setShowModal(false);
      await loadDepartments();
    } catch (err) {
      setError(err.message || 'Failed to save department.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (dept) => {
    try {
      await fetch('/api/admin/departments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dept.id,
          is_active: !dept.is_active,
        }),
      });
      await loadDepartments();
    } catch {
      // quiet
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg"></div>
        <div className="loading-text">Loading departments...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Departments</h1>
          <p>Manage university departments for complaint routing</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>Add Department</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id}>
                <td style={{ fontWeight: 600 }}>{dept.name}</td>
                <td className="text-sm text-muted">{dept.description || '—'}</td>
                <td>
                  <span className={`badge ${dept.is_active ? 'badge-resolved' : 'badge-closed'}`}>
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-sm">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(dept)}>Edit</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleActive(dept)}>
                      {dept.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Department' : 'Add Department'}</h2>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>X</button>
            </div>
            <div className="modal-body">
              {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
              <div className="form-group">
                <label className="form-label">Name <span className="required">*</span></label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Information Technology"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of department responsibilities"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
