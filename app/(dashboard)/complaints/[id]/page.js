'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ComplaintReviewPage() {
  const [complaint, setComplaint] = useState(null);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editResponse, setEditResponse] = useState('');
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);

      const res = await fetch(`/api/complaints/${params.id}`);
      const data = await res.json();
      if (!res.ok) {
        setError('Complaint not found.');
        setLoading(false);
        return;
      }
      setComplaint(data.complaint);
      setHistory(data.history || []);
      setEditResponse(data.complaint.final_response || data.complaint.ai_response_draft || '');

      const [{ data: cats }, { data: depts }] = await Promise.all([
        supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
      ]);
      setCategories(cats || []);
      setDepartments(depts || []);
    } catch {
      setError('Failed to load complaint case.');
    } finally {
      setLoading(false);
    }
  }

  async function updateComplaint(updates, actionDesc) {
    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/complaints/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          performed_by: user?.id,
          action_description: actionDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Update failed.');
        return;
      }
      setSuccess(actionDesc || 'Case updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch {
      setError('Failed to update complaint.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setError('');
    try {
      const res = await fetch(`/api/complaints/${params.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performed_by: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Regeneration failed.');
        return;
      }
      setSuccess('AI analysis regenerated successfully');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch {
      setError('Failed to regenerate AI analysis.');
    } finally {
      setRegenerating(false);
    }
  }

  const handleApproveAndRoute = async () => {
    await updateComplaint(
      {
        status: 'routed',
        reviewed_by: user?.id,
        final_category_id: complaint.final_category_id || complaint.ai_category_id,
        final_priority: complaint.final_priority || complaint.ai_priority,
        final_department_id: complaint.final_department_id || complaint.ai_department_id,
        final_response: editResponse || complaint.ai_response_draft,
      },
      'Approved triage recommendations and routed to department'
    );
  };

  const handleSendResponse = async () => {
    await updateComplaint(
      {
        final_response: editResponse,
        response_sent: true,
      },
      'Official response dispatched to student'
    );
  };

  const handleStatusChange = async (newStatus) => {
    const readable = newStatus.replace(/_/g, ' ');
    await updateComplaint({ status: newStatus }, `Case status updated to ${readable}`);
  };

  const getPriorityColor = (p) => {
    const map = { low: 'var(--priority-low)', normal: 'var(--priority-normal)', high: 'var(--priority-high)', critical: 'var(--priority-critical)' };
    return map[p] || 'var(--text-muted)';
  };

  const getStatusBadge = (s) => {
    const map = { new: 'badge-new', under_review: 'badge-under-review', routed: 'badge-routed', in_progress: 'badge-in-progress', resolved: 'badge-resolved', closed: 'badge-closed' };
    return map[s] || 'badge-new';
  };

  const formatStatus = (s) => s?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'New';
  const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg"></div>
        <div className="loading-text">Loading complaint case details...</div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>Complaint Case Not Found</h3>
          <p>The case record you requested could not be retrieved.</p>
          <Link href="/complaints" className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>Back to Complaints</Link>
        </div>
      </div>
    );
  }

  const effectivePriority = complaint.final_priority || complaint.ai_priority;
  const effectiveCategory = complaint.final_category?.name || complaint.ai_category?.name;
  const effectiveDepartment = complaint.final_dept?.name || complaint.ai_department?.name;

  return (
    <div>
      {/* Top Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="flex items-center gap-sm" style={{ marginBottom: '4px' }}>
            <Link href="/complaints" style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>Complaints</Link>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>/</span>
            <span style={{ color: 'var(--text-accent)', fontSize: '0.825rem', fontWeight: 600 }}>{complaint.complaint_number}</span>
          </div>
          <h1>Staff Review & Triage</h1>
        </div>
        <div className="flex gap-sm items-center">
          <span className={`badge ${getStatusBadge(complaint.status)}`} style={{ padding: '5px 12px' }}>
            Status: {formatStatus(complaint.status)}
          </span>
          <span className={`badge ${complaint.ai_priority === 'critical' ? 'badge-critical' : complaint.ai_priority === 'high' ? 'badge-high' : complaint.ai_priority === 'normal' ? 'badge-normal' : 'badge-low'}`} style={{ padding: '5px 12px' }}>
            Priority: {effectivePriority?.toUpperCase() || 'NORMAL'}
          </span>
        </div>
      </div>

      {/* Notifications */}
      {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '16px', fontSize: '0.85rem', color: '#10b981' }}>
          {success}
        </div>
      )}

      <div className="grid-2">
        {/* Left Column: Original Complaint & Response Drafting */}
        <div>
          {/* Student Message Card */}
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-md)' }}>
              <h3>Original Student Submission</h3>
              <span className="badge badge-low" style={{ textTransform: 'uppercase' }}>
                Channel: {complaint.source}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '14px', background: 'var(--bg-elevated)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ minWidth: 0 }}>
                <div className="text-xs text-muted">Student</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', overflowWrap: 'anywhere' }}>{complaint.student_name}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="text-xs text-muted">Roll No. / ID</div>
                <div style={{ fontSize: '0.875rem', overflowWrap: 'anywhere' }}>{complaint.student_id || '—'}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="text-xs text-muted">Email Address</div>
                <div style={{ fontSize: '0.875rem', overflowWrap: 'anywhere' }}>{complaint.student_email || '—'}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="text-xs text-muted">Received Date</div>
                <div style={{ fontSize: '0.85rem', overflowWrap: 'anywhere' }}>{formatDate(complaint.created_at)}</div>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-primary)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              lineHeight: 1.7,
              color: 'var(--text-primary)',
            }}>
              {complaint.complaint_text}
            </div>
          </div>

          {/* Response Draft & Dispatch */}
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-md)' }}>
              <h3>Student Communication Response</h3>
              <div className="flex gap-sm items-center">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsEditingResponse(!isEditingResponse)}
                >
                  {isEditingResponse ? 'Preview Mode' : 'Edit Response'}
                </button>
                {complaint.response_sent && (
                  <span className="badge badge-resolved">Dispatched</span>
                )}
              </div>
            </div>

            {isEditingResponse ? (
              <textarea
                className="form-textarea"
                value={editResponse}
                onChange={(e) => setEditResponse(e.target.value)}
                rows={5}
                placeholder="Compose response to the student..."
              />
            ) : (
              <div style={{
                background: 'var(--bg-elevated)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                lineHeight: 1.65,
                color: 'var(--text-secondary)',
                borderLeft: '3px solid var(--primary-500)',
              }}>
                {editResponse || complaint.ai_response_draft || 'No response draft available.'}
              </div>
            )}

            {!complaint.response_sent && (
              <div className="flex gap-sm" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleSendResponse}
                  disabled={updating || !editResponse.trim()}
                >
                  Mark Response as Sent
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    updateComplaint({ final_response: editResponse }, 'Saved updated draft');
                  }}
                  disabled={updating}
                >
                  Save Draft
                </button>
              </div>
            )}
          </div>

          {/* Audit History Timeline */}
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Case History & Audit Log</h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted">No prior actions recorded for this case.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map((h) => (
                  <div key={h.id} style={{
                    padding: '9px 13px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '2px solid var(--border-secondary)',
                  }}>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{h.action}</span>
                      <span className="text-xs text-muted">{formatDate(h.created_at)}</span>
                    </div>
                    {h.details && <p className="text-xs text-muted" style={{ marginTop: '3px' }}>{h.details}</p>}
                    {h.performer?.full_name && (
                      <p className="text-xs text-muted" style={{ marginTop: '2px' }}>by {h.performer.full_name}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Triage Insights & Staff Action Center */}
        <div>
          {/* AI Analysis Card */}
          <div className="ai-card" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="ai-card-header">
              <h3 style={{ fontSize: '0.9rem' }}>AI Triage Assessment</h3>
              {complaint.ai_confidence && (
                <span className={`badge badge-confidence-${complaint.ai_confidence}`}>
                  {complaint.ai_confidence} Confidence
                </span>
              )}
            </div>
            <div className="ai-card-body">
              <div className="ai-field">
                <span className="ai-field-label">Assigned Category</span>
                <span className="ai-field-value">{effectiveCategory || '—'}</span>
              </div>
              {complaint.ai_subcategory && (
                <div className="ai-field">
                  <span className="ai-field-label">Subcategory</span>
                  <span className="ai-field-value">{complaint.ai_subcategory}</span>
                </div>
              )}
              <div className="ai-field">
                <span className="ai-field-label">Detected Urgency</span>
                <span className="ai-field-value" style={{ color: getPriorityColor(effectivePriority) }}>
                  {effectivePriority?.toUpperCase() || 'NORMAL'}
                </span>
              </div>
              <div className="ai-field">
                <span className="ai-field-label">Routed Department</span>
                <span className="ai-field-value">{effectiveDepartment || '—'}</span>
              </div>

              {complaint.ai_priority_reason && (
                <div style={{ marginTop: '10px' }}>
                  <div className="ai-field-label" style={{ marginBottom: '3px' }}>Urgency Rationale</div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{complaint.ai_priority_reason}</p>
                </div>
              )}

              {complaint.ai_summary && (
                <div style={{ marginTop: '10px' }}>
                  <div className="ai-field-label" style={{ marginBottom: '3px' }}>Executive Summary</div>
                  <p style={{
                    fontSize: '0.85rem',
                    background: 'var(--bg-elevated)',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                  }}>{complaint.ai_summary}</p>
                </div>
              )}

              {complaint.ai_missing_info && (
                <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600 }}>Missing Detail:</span>
                  <p className="text-sm" style={{ color: '#fbbf24', marginTop: '2px' }}>{complaint.ai_missing_info}</p>
                </div>
              )}

              {complaint.ai_is_sensitive && (
                <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700 }}>
                    Sensitive Case Flagged for Human Oversight
                  </span>
                </div>
              )}

              <button
                type="button"
                className="btn btn-ghost btn-sm w-full"
                style={{ marginTop: '14px' }}
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? 'Regenerating AI Analysis...' : 'Re-run Gemini AI Analysis'}
              </button>
            </div>
          </div>

          {/* Human-in-the-Loop Override Panel */}
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Staff Decision Overrides</h3>

            <div className="form-group">
              <label className="form-label">Classification Category</label>
              <select
                className="form-select"
                value={complaint.final_category_id || complaint.ai_category_id || ''}
                onChange={(e) => updateComplaint({ final_category_id: e.target.value || null }, 'Category modified by staff')}
                disabled={updating}
              >
                <option value="">— Use AI Recommendation —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Urgency Priority</label>
              <select
                className="form-select"
                value={complaint.final_priority || complaint.ai_priority || ''}
                onChange={(e) => updateComplaint({ final_priority: e.target.value || null }, 'Priority modified by staff')}
                disabled={updating}
              >
                <option value="">— Use AI Recommendation —</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assign Responsible Department</label>
              <select
                className="form-select"
                value={complaint.final_department_id || complaint.ai_department_id || ''}
                onChange={(e) => updateComplaint({ final_department_id: e.target.value || null }, 'Department routing modified by staff')}
                disabled={updating}
              >
                <option value="">— Use AI Recommendation —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Workflow Actions */}
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Workflow Triage Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['new', 'under_review'].includes(complaint.status) && (
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={handleApproveAndRoute}
                  disabled={updating}
                >
                  {updating ? 'Processing...' : 'Approve & Route to Department'}
                </button>
              )}

              {complaint.status === 'new' && (
                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={() => handleStatusChange('under_review')}
                  disabled={updating}
                >
                  Mark as Under Review
                </button>
              )}

              {complaint.status === 'routed' && (
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={updating}
                >
                  Mark Case In Progress
                </button>
              )}

              {complaint.status === 'in_progress' && (
                <button
                  type="button"
                  className="btn btn-success w-full"
                  onClick={() => handleStatusChange('resolved')}
                  disabled={updating}
                >
                  Mark as Resolved
                </button>
              )}

              {complaint.status === 'resolved' && (
                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={() => handleStatusChange('closed')}
                  disabled={updating}
                >
                  Close Case
                </button>
              )}

              {!['resolved', 'closed'].includes(complaint.status) && (
                <button
                  type="button"
                  className="btn btn-danger w-full btn-sm"
                  onClick={() => handleStatusChange('closed')}
                  disabled={updating}
                  style={{ marginTop: '6px' }}
                >
                  Force Close Case
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
