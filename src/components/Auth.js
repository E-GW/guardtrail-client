// Auth.js
// Handles user authentication — sign in, sign up, and email confirmation.
// Uses AWS Amplify v6 to communicate with Amazon Cognito.

import React, { useState } from 'react';
import { Amplify } from 'aws-amplify';
import awsConfig from '../aws-config';
import { signIn, signUp, confirmSignUp, fetchAuthSession } from 'aws-amplify/auth';

// Configure Amplify with your Cognito User Pool settings
Amplify.configure(awsConfig);

export default function AuthScreen({ onLogin }) {
  // Controls which form is visible: sign-in, sign-up, or confirmation code entry
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sign in an existing user.
  // After Cognito authenticates the user, we fetch their session to extract
  // the JWT access token (used to authorize API requests) and the user's role
  // from the ID token payload (stored as a custom Cognito attribute).
  async function handleSignIn(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ username: email, password });

      // fetchAuthSession returns the current session including both
      // the access token (for API auth) and the ID token (for user attributes)
      const session = await fetchAuthSession();
      const token = session.tokens.accessToken.toString();
      const role = session.tokens.idToken.payload['custom:role'] || 'public';

      // Store the token in localStorage so the API interceptor can attach it
      // to outgoing requests without requiring the user to sign in again
      localStorage.setItem('guardtrail_token', token);
      onLogin({ email, role, token });

    } catch (err) {
      // Amplify throws UserAlreadyAuthenticatedException if a session already
      // exists (e.g. the user refreshed the page without signing out).
      // In that case, we skip signIn() and just fetch the existing session.
      if (err.name === 'UserAlreadyAuthenticatedException') { 
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

  // Register a new user with Cognito.
  // The custom:role attribute is set to 'public' by default.
  // Land manager role must be assigned manually via the AWS Console.
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
            // Use the part of the email before @ as a display name
            name: email.split('@')[0],
            preferred_username: email.split('@')[0],
            'custom:role': 'public',
          }
        }
      });
      // After sign-up, Cognito sends a confirmation code to the user's email
      setMode('confirm');
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  // Confirm a new account using the 6-digit code Cognito emailed to the user
  async function handleConfirm(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      // After confirmation, redirect to sign-in
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

        {/* Subtitle changes depending on which form is active */}
        <div className="auth-subtitle">
          {mode === 'signin' && 'Sign in to submit and manage trail reports'}
          {mode === 'signup' && 'Create a free account to get started'}
          {mode === 'confirm' && 'Check your email for a confirmation code'}
        </div>

        {/* Sign-in form */}
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

        {/* Sign-up form */}
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

        {/* Email confirmation form */}
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
