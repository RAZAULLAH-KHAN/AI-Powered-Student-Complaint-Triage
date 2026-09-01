'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function NewComplaintPage() {
  const [formData, setFormData] = useState({
    student_name: '',
    student_id: '',
    student_email: '',
    complaint_text: '',
    source: 'manual',
  });
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const loadExample = (type) => {
    if (type === 'exam') {
      setFormData({
        student_name: 'Zubair Qasim',
        student_id: 'FA21-BCS-089',
        student_email: 'zubair.q@student.edu',
        complaint_text: 'My midterm exam is scheduled for tomorrow at 9:00 AM in Hall A, but my course registration slip is missing from the student portal. Please resolve this before morning.',
        source: 'whatsapp',
      });
    } else if (type === 'finance') {
      setFormData({
        student_name: 'Marium Shakeel',
        student_id: 'SP22-BSE-014',
        student_email: 'marium.s@student.edu',
        complaint_text: 'I submitted my tuition fee voucher at the bank counter yesterday morning. However, my account status still shows overdue and registration closes tomorrow evening.',
        source: 'email',
      });
    } else if (type === 'it') {
      setFormData({
        student_name: 'Danish Khan',
        student_id: 'FA23-BAI-072',
        student_email: 'danish.k@student.edu',
        complaint_text: 'Unable to upload assignment on LMS portal. It shows error 500 server error and the deadline is tonight at 11:59 PM.',
        source: 'manual',
      });
    }
    setAnalysis(null);
    setError('');
  };

  const handleAnalyze = async () => {
    if (!formData.complaint_text || formData.complaint_text.trim().length < 10) {
      setError('Please enter a complaint with at least 10 characters.');
      return;
    }

    setAnalyzing(true);
    setError('');
    setAnalysis(null);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint_text: formData.complaint_text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'AI analysis failed.');
        return;
      }

      setAnalysis(data.analysis);
    } catch {
      setError('Failed to connect to AI analysis engine. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.student_name.trim()) {
      setError('Student name is required.');
      return;
    }
    if (!formData.complaint_text.trim()) {
      setError('Complaint text is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...formData,
        created_by: user?.id || null,
      };

      if (analysis) {
        payload.ai_category = analysis.category;
        payload.ai_subcategory = analysis.subcategory;
        payload.ai_priority = analysis.priority;
        payload.ai_priority_reason = analysis.priority_reason;
        payload.ai_department = analysis.department;
        payload.ai_summary = analysis.summary;
        payload.ai_response_draft = analysis.response_draft;
        payload.ai_confidence = analysis.confidence;
        payload.ai_missing_info = analysis.missing_info;
        payload.ai_is_sensitive = analysis.is_sensitive;
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create complaint.');
        return;
      }

      router.push(`/complaints/${data.complaint.id}`);
    } catch {
      setError('Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority) => {
    const map = {
      low: 'var(--priority-low)',
      normal: 'var(--priority-normal)',
      high: 'var(--priority-high)',
      critical: 'var(--priority-critical)',
    };
    return map[priority] || 'var(--text-muted)';
  };

  const getConfidenceColor = (confidence) => {
    const map = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' };
    return map[confidence] || 'var(--text-muted)';
  };

  return (
    <div>
      <div className="page-header">
        <h1>New Complaint Intake</h1>
        <p>Log a student grievance from email, WhatsApp, or front-desk and run AI classification</p>
      </div>

      {/* Quick Example Presets */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: '12px 16px' }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <span className="text-sm" style={{ fontWeight: 600 }}>Quick Test Presets:</span>
          <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadExample('exam')}>
              Urgent Exam Issue
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadExample('finance')}>
              Fee Payment Deadline
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadExample('it')}>
              LMS Assignment Upload Error
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="login-error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div className="grid-2">
        {/* Intake Form */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '1rem' }}>Student & Case Details</h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="student_name">
                  Student Name <span className="required">*</span>
                </label>
                <input
                  id="student_name"
                  name="student_name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ahmad Bilal"
                  value={formData.student_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="student_id">
                  Student ID / Roll No.
                </label>
                <input
                  id="student_id"
                  name="student_id"
                  type="text"
                  className="form-input"
                  placeholder="e.g. FA21-BCS-042"
                  value={formData.student_id}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="student_email">
                  Student Email
                </label>
                <input
                  id="student_email"
                  name="student_email"
                  type="email"
                  className="form-input"
                  placeholder="student@university.edu"
                  value={formData.student_email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="source">
                  Intake Channel
                </label>
                <select
                  id="source"
                  name="source"
                  className="form-select"
                  value={formData.source}
                  onChange={handleChange}
                >
                  <option value="manual">Manual / Walk-in</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="complaint_text">
                Raw Complaint Message <span className="required">*</span>
              </label>
              <textarea
                id="complaint_text"
                name="complaint_text"
                className="form-textarea"
                placeholder="Paste or type the student's message verbatim..."
                value={formData.complaint_text}
                onChange={handleChange}
                rows={6}
                required
              />
              <div className="form-hint">
                Provide full context including dates, error codes, or deadlines mentioned.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={analyzing || !formData.complaint_text.trim()}
              >
                {analyzing ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, marginRight: 6 }}></span>
                    Analyzing with Gemini AI...
                  </>
                ) : (
                  'Analyze with AI'
                )}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSubmit}
                disabled={submitting || !formData.student_name.trim() || !formData.complaint_text.trim()}
              >
                {submitting ? 'Saving...' : 'Save & Open Case'}
              </button>
            </div>
          </div>
        </div>

        {/* AI Analysis Results Panel */}
        <div>
          {analyzing && (
            <div className="ai-card">
              <div className="ai-card-header">
                <h3>AI Triage In Progress</h3>
              </div>
              <div className="ai-card-body">
                <div className="loading-page" style={{ minHeight: '200px' }}>
                  <div className="spinner spinner-lg"></div>
                  <div className="loading-text">Extracting category, priority, and drafting response...</div>
                </div>
              </div>
            </div>
          )}

          {analysis && !analyzing && (
            <div className="ai-card">
              <div className="ai-card-header">
                <h3>AI Triage Recommendation</h3>
                <span
                  className="badge"
                  style={{
                    marginLeft: 'auto',
                    background: `${getConfidenceColor(analysis.confidence)}20`,
                    color: getConfidenceColor(analysis.confidence),
                  }}
                >
                  {analysis.confidence} confidence
                </span>
              </div>
              <div className="ai-card-body">
                <div className="ai-field">
                  <span className="ai-field-label">Category</span>
                  <span className="ai-field-value">{analysis.category}</span>
                </div>
                {analysis.subcategory && (
                  <div className="ai-field">
                    <span className="ai-field-label">Subcategory</span>
                    <span className="ai-field-value">{analysis.subcategory}</span>
                  </div>
                )}
                <div className="ai-field">
                  <span className="ai-field-label">Assessed Priority</span>
                  <span
                    className="ai-field-value"
                    style={{ color: getPriorityColor(analysis.priority) }}
                  >
                    {analysis.priority?.toUpperCase()}
                  </span>
                </div>
                <div className="ai-field">
                  <span className="ai-field-label">Recommended Department</span>
                  <span className="ai-field-value">{analysis.department}</span>
                </div>

                <div style={{ marginTop: 'var(--space-md)' }}>
                  <div className="ai-field-label" style={{ marginBottom: '4px' }}>Priority Rationale</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {analysis.priority_reason}
                  </p>
                </div>

                <div style={{ marginTop: 'var(--space-md)' }}>
                  <div className="ai-field-label" style={{ marginBottom: '4px' }}>Structured Summary</div>
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-elevated)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    lineHeight: 1.5,
                  }}>
                    {analysis.summary}
                  </p>
                </div>

                {analysis.missing_info && (
                  <div style={{ marginTop: 'var(--space-md)' }}>
                    <div className="ai-field-label" style={{ marginBottom: '4px', color: 'var(--priority-high)' }}>
                      Information Gap Detected
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--priority-high)' }}>
                      {analysis.missing_info}
                    </p>
                  </div>
                )}

                {analysis.is_sensitive && (
                  <div style={{
                    marginTop: 'var(--space-md)',
                    padding: '10px 12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <strong style={{ color: '#ef4444', fontSize: '0.825rem' }}>
                      Sensitive Content Flag — Requires Senior Staff Review
                    </strong>
                  </div>
                )}

                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <div className="ai-field-label" style={{ marginBottom: '4px' }}>Drafted Response</div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-elevated)',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    lineHeight: 1.6,
                    borderLeft: '3px solid var(--primary-500)',
                  }}>
                    {analysis.response_draft}
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? 'Creating Case...' : 'Accept AI Triage & Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!analysis && !analyzing && (
            <div className="card">
              <div className="empty-state" style={{ padding: '36px 16px' }}>
                <h3>AI Triage Assistant</h3>
                <p>Click &quot;Analyze with AI&quot; to automatically classify, assess urgency, route to the correct department, and draft an empathetic student response.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
