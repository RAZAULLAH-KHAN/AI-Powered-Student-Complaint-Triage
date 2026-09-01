'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split('@')[0],
            role: 'admin',
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data?.user?.identities?.length === 0) {
        setError('An account with this email already exists.');
        return;
      }

      if (data?.session) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError('');
        alert('Account created! Please check your email for confirmation, or sign in if auto-confirmed.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ position: 'relative' }}>
      {/* Floating Theme Toggle in Top Right */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 10, width: '130px' }}>
        <ThemeToggle />
      </div>

      <div className="login-card">
        <div className="login-header">
          <h1>Complaint Triage</h1>
          <p>Staff Access & Administration Portal</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Staff Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="staff@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginBottom: '12px' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, marginRight: 8 }}></span>
                Signing in...
              </>
            ) : (
              'Sign In to Staff Portal'
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-lg w-full"
            disabled={loading}
            onClick={handleSignUp}
          >
            {loading ? 'Processing...' : 'Create Staff Account'}
          </button>
        </form>

        {/* Clean, spacious Student Portal section without overlapping text */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-primary)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Student Portal
          </div>
          <Link
            href="/submit"
            className="btn btn-secondary btn-lg w-full"
            style={{ border: '1px dashed var(--primary-500)', color: 'var(--primary-600)', fontWeight: 600 }}
          >
            Submit Student Complaint →
          </Link>
        </div>

        <p className="text-center text-xs text-muted" style={{ marginTop: '24px' }}>
          University Student Complaint System
        </p>
      </div>
    </div>
  );
}
