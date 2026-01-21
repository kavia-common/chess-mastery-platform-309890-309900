import React, { useMemo, useState } from 'react';
import { Card, Button, Input } from '../components/ui';
import { useAuth } from '../state/AuthContext';

// PUBLIC_INTERFACE
export function ProfilePage() {
  /** Profile view/edit for current user. */
  const { user, actions } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const changed = useMemo(() => username !== (user?.username || '') || email !== (user?.email || ''), [username, email, user]);

  const save = async () => {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      await actions.updateProfile({ username, email });
      setMsg('Profile updated.');
    } catch (e) {
      setErr(e.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="pageTitle">Profile</div>

      <Card className="pageCard">
        <div className="rowBetween" style={{ marginBottom: 12 }}>
          <div>
            <div className="sectionTitle">{user?.username}</div>
            <div className="muted">User ID: {user?.id}</div>
          </div>
          <Button variant="secondary" onClick={actions.logout}>
            Sign out
          </Button>
        </div>

        <div className="grid2">
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>

        {err ? <div className="inlineError" style={{ marginTop: 10 }}>{err}</div> : null}
        {msg ? <div className="inlineSuccess" style={{ marginTop: 10 }}>{msg}</div> : null}

        <div style={{ marginTop: 12 }}>
          <Button onClick={save} disabled={!changed || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
