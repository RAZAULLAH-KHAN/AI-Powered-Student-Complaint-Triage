'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function StudentPublicSubmitPage() {
  const [form, setForm] = useState({
    student_name: '',
    student_id: '',
    student_email: '',
    complaint_text: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedCase, setSubmittedCase] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const loadPreset = (preset) => {
    if (preset === 1) {
      setForm({
        student_name: 'Usman Ali',
        student_id: 'bscs23f28@namal.edu.pk',
        student_email: 'bscs23f28@namal.edu.pk',
        complaint_text: 'My midterm exam is scheduled for tomorrow at 9:00 AM in Hall B, but my admit card slip is missing from my portal account. Please fix this urgently.',
      });
    } else if (preset === 2) {
      setForm({
        student_name: 'Ayesha Bibi',
        student_id: 'bse22m14@namal.edu.pk',
        student_email: 'bse22m14@namal.edu.pk',
        complaint_text: 'I paid my semester fee voucher yesterday at the bank counter, but the portal still displays unpaid and late penalty fine is accumulating.',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_name.trim() || !form.student_email.trim() || !form.complaint_text.trim()) {
      setError('Please fill in your name, email, and complaint details.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 1. Run AI analysis behind the scenes
      let aiData = null;
      try {
        const aiRes = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complaint_text: form.complaint_text }),
        });
        if (aiRes.ok) {
          const aiJson = await aiRes.json();
          aiData = aiJson.analysis;
        }
      } catch {
        // quiet fallback
      }

      // 2. Submit complaint
      const payload = {
        student_name: form.student_name.trim(),
        student_id: form.student_id.trim() || null,
        student_email: form.student_email.trim(),
        complaint_text: form.complaint_text.trim(),
        source: 'email',
      };

      if (aiData) {
        payload.ai_category = aiData.category;
        payload.ai_subcategory = aiData.subcategory;
        payload.ai_priority = aiData.priority;
        payload.ai_priority_reason = aiData.priority_reason;
        payload.ai_department = aiData.department;
        payload.ai_summary = aiData.summary;
        payload.ai_response_draft = aiData.response_draft;
        payload.ai_confidence = aiData.confidence;
        payload.ai_missing_info = aiData.missing_info;
        payload.ai_is_sensitive = aiData.is_sensitive;
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit complaint.');
      }

      setSubmittedCase(data.complaint);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page" style={{ position: 'relative' }}>
      {/* Floating Theme Toggle in Top Right */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 10, width: '130px' }}>
        <ThemeToggle />
      </div>

      <div className="login-card" style={{ maxWidth: '480px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Link href="/login" style={{ color: 'var(--text-muted)', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Staff Sign In
          </Link>
        </div>

        <div className="login-header">
          <h1>Student Complaint Portal</h1>
          <p>AI-Powered Student Grievance Submission</p>
        </div>

        {submittedCase ? (
          <div className="empty-state" style={{ padding: '12px 0' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              width: '100%',
              textAlign: 'left',
            }}>
              <span className="badge badge-resolved" style={{ marginBottom: '8px' }}>Submitted Successfully</span>
              <h2 style={{ fontSize: '1.15rem', margin: '6px 0 8px 0', color: 'var(--text-primary)' }}>
                Reference Code: <span style={{ color: 'var(--primary-600)' }}>{submittedCase.complaint_number}</span>
              </h2>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Thank you, <strong>{submittedCase.student_name}</strong>. Your complaint has been received and automatically routed for triage.
              </p>
              <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-muted)' }}>
                An official response will be sent to <strong>{submittedCase.student_email}</strong> once reviewed by university staff.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg w-full"
                onClick={() => {
                  setSubmittedCase(null);
                  setForm({ student_name: '', student_id: '', student_email: '', complaint_text: '' });
                }}
              >
                Submit Another Complaint
              </button>

              <Link
                href="/login"
                className="btn btn-secondary btn-lg w-full"
              >
                Return to Main Login Page →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="login-error">{error}</div>}

            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: '16px' }}>
              <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '4px' }}>
                <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Presets:</span>
                <div className="flex gap-xs">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadPreset(1)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                    Exam Issue
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadPreset(2)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                    Fee Voucher
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="student_name">
                Student Full Name <span className="required">*</span>
              </label>
              <input
                id="student_name"
                name="student_name"
                type="text"
                className="form-input"
                placeholder="e.g. Usman Ali"
                value={form.student_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="student_email">
                Student Email Address <span className="required">*</span>
              </label>
              <input
                id="student_email"
                name="student_email"
                type="email"
                className="form-input"
                placeholder="bscs23f28@namal.edu.pk"
                value={form.student_email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="student_id">
                Student Roll No. / ID
              </label>
              <input
                id="student_id"
                name="student_id"
                type="text"
                className="form-input"
                placeholder="e.g. bscs23f28@namal.edu.pk"
                value={form.student_id}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="complaint_text">
                Complaint Message <span className="required">*</span>
              </label>
              <textarea
                id="complaint_text"
                name="complaint_text"
                className="form-textarea"
                placeholder="Describe your complaint in detail..."
                value={form.complaint_text}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={submitting}
              style={{ marginBottom: '12px' }}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, marginRight: 8 }}></span>
                  Submitting...
                </>
              ) : (
                'Submit Complaint'
              )}
            </button>

            <Link
              href="/login"
              className="btn btn-secondary btn-lg w-full"
            >
              Staff Sign In Portal →
            </Link>
          </form>
        )}

        <p className="text-center text-xs text-muted" style={{ marginTop: '24px' }}>
          University Student Complaint System
        </p>
      </div>
    </div>
  );
}
