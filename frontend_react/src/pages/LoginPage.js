import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '../components/ui';
import { useAuth } from '../state/AuthContext';

// PUBLIC_INTERFACE
export function LoginPage() {
  /** Login form for JWT auth. */
  const { actions } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await actions.login({ usernameOrEmail, password });
      navigate(from, { replace: true });
    } catch (ex) {
      setErr(ex.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pageCenter">
      <Card className="authCard">
        <div className="authTitle">Sign in</div>
        <div className="muted">Welcome back. Play real-time chess and chat.</div>

        <form onSubmit={onSubmit} className="form">
          <Input
            label="Username or email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            placeholder="alice or alice@example.com"
            required
          />
          <Input
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
          {err ? <div className="inlineError">{err}</div> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="authFooter">
          <span className="muted">New here?</span> <Link to="/register">Create an account</Link>
        </div>
      </Card>
    </div>
  );
}
