import React, { useState } from 'react';
import { Amplify } from 'aws-amplify';
import awsConfig from '../aws-config';
import { signIn, signUp, confirmSignUp, fetchAuthSession } from 'aws-amplify/auth';

Amplify.configure(awsConfig);

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'confirm'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ username: email, password });
      const session = await fetchAuthSession();
      const token = session.tokens.accessToken.toString();
      const role = session.tokens.idToken.payload['custom:role'] || 'public';
      localStorage.setItem('guardtrail_token', token);
      onLogin({ email, role, token });
    } catch (err) {
      if (err.name === 'UserAlreadyAuthenticatedException') {
        // Already signed in — just fetch the existing session
        try {
          const session = await fetchAuthSession();
          const token = session.tokens.accessToken.toString();
          const role = session.tokens.idToken.payload['custom:role'] || 'public';
          localStorage.setItem('guardtrail_token', token);
          onLogin({ email, role, token });
        } catch (sessionErr) {
          setError('Session error. Please refresh the page.');
        }
      } else {
        setError(err.message || 'Sign in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name: email.split('@')[0], // uses the part before @ as a display name
            preferred_username: email.split('@')[0],
            'custom:role': 'public',
          }
        }
      });
      setMode('confirm');
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setMode('signin');
      setError('Account confirmed! Please sign in.');
    } catch (err) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-title">🗺 GuardTrail</div>
        <div className="auth-subtitle">
          {mode === 'signin' && 'Sign in to submit and manage trail reports'}
          {mode === 'signup' && 'Create a free account to get started'}
          {mode === 'confirm' && 'Check your email for a confirmation code'}
        </div>

        {mode === 'signin' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <div className="auth-toggle">
              Don't have an account?{' '}
              <span onClick={() => { setMode('signup'); setError(''); }}>Sign up</span>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password (8+ characters)</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
            <div className="auth-toggle">
              Already have an account?{' '}
              <span onClick={() => { setMode('signin'); setError(''); }}>Sign in</span>
            </div>
          </form>
        )}

        {mode === 'confirm' && (
          <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Confirmation code</label>
              <input className="form-input" type="text" value={code}
                onChange={e => setCode(e.target.value)} required />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Confirming...' : 'Confirm account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
