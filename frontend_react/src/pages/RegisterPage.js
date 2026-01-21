import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/ui';
import { useAuth } from '../state/AuthContext';

// PUBLIC_INTERFACE
export function RegisterPage() {
  /** Register form for JWT auth. */
  const { actions } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await actions.register({ username, email, password });
      navigate('/', { replace: true });
    } catch (ex) {
      setErr(ex.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pageCenter">
      <Card className="authCard">
        <div className="authTitle">Create account</div>
        <div className="muted">Start playing and climb the leaderboard.</div>

        <form onSubmit={onSubmit} className="form">
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <Input
            label="Password"
            hint="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
          {err ? <div className="inlineError">{err}</div> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </Button>
        </form>

        <div className="authFooter">
          <span className="muted">Already have an account?</span> <Link to="/login">Sign in</Link>
        </div>
      </Card>
    </div>
  );
}
