import { useState } from 'react';
import { Shield, Users, Database, DollarSign } from 'lucide-react';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [adjustData, setAdjustData] = useState({ username: '', amount: '' });
  const [adjustMsg, setAdjustMsg] = useState('');

  const fetchStats = async (pwd) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
        setAuthenticated(true);
      } else {
        setError(data.error);
        setAuthenticated(false);
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetchStats(password);
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    setAdjustMsg('');
    try {
      const res = await fetch('/api/admin/adjust-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, targetUsername: adjustData.username, amount: Number(adjustData.amount) })
      });
      const data = await res.json();
      if (res.ok) {
        setAdjustMsg('✅ ' + data.message);
        setAdjustData({ username: '', amount: '' });
        fetchStats(password); // refresh
      } else {
        setAdjustMsg('❌ ' + data.error);
      }
    } catch (err) {
      setAdjustMsg('❌ Connection error');
    }
  };

  if (!authenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ borderColor: 'var(--accent-color)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
            <Shield size={48} />
          </div>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin Access</h2>
          {error && <div style={{ color: 'var(--accent-color)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Enter Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield color="var(--accent-color)" /> Admin Dashboard
        </h1>
        <button className="btn btn-secondary" onClick={() => fetchStats(password)}>Refresh Data</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ backgroundColor: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> Total Users</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{stats.count}</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Database size={18} /> System Liability</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color: 'var(--success-color)' }}>
            KSH {stats.totalBalance.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* Users Table */}
        <div style={{ backgroundColor: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>User Database</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Username</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Phone</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {stats.users.map((u, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>{u.username}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{u.phone}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--success-color)' }}>
                      KSH {u.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Panel */}
        <div style={{ backgroundColor: 'var(--bg-panel)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign color="var(--success-color)" /> Manual Adjustment
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Add or subtract balance from any user. Use negative numbers to deduct.
          </p>
          <form onSubmit={handleAdjust}>
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                className="form-control" 
                value={adjustData.username} 
                onChange={e => setAdjustData(prev => ({...prev, username: e.target.value}))} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Amount (KSH)</label>
              <input 
                type="number" 
                className="form-control" 
                value={adjustData.amount} 
                onChange={e => setAdjustData(prev => ({...prev, amount: e.target.value}))} 
                required 
              />
            </div>
            <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '0.5rem' }}>Apply Adjustment</button>
          </form>
          {adjustMsg && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.9rem' }}>
              {adjustMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
