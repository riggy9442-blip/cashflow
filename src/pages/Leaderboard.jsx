import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, Users } from 'lucide-react';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => { setLeaders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', padding: '2rem 0' }}>
      <div className="container" style={{ maxWidth: '700px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Leaderboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Top players by current balance</p>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {[
            { icon: <Users size={20} />, label: 'Total Players', value: leaders.length },
            { icon: <Trophy size={20} />, label: 'Top Balance', value: leaders[0] ? `KSH ${leaders[0].balance.toLocaleString()}` : '—' },
            { icon: <TrendingUp size={20} />, label: 'Avg Balance', value: leaders.length ? `KSH ${Math.round(leaders.reduce((s,u) => s + u.balance, 0) / leaders.length).toLocaleString()}` : '—' },
          ].map((stat, i) => (
            <div key={i} style={{
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ color: 'var(--accent-color)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{stat.value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 140px',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <span>Rank</span>
            <span>Player</span>
            <span style={{ textAlign: 'right' }}>Balance</span>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading leaderboard...
            </div>
          ) : leaders.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No players yet. <Link to="/register" style={{ color: 'var(--accent-color)' }}>Be the first!</Link>
            </div>
          ) : (
            leaders.map((player, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 140px',
                padding: '1rem 1.5rem',
                borderTop: i > 0 ? '1px solid var(--border-color)' : 'none',
                backgroundColor: i === 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                alignItems: 'center',
                transition: 'background 0.2s',
              }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {i < 3 ? medals[i] : `#${i + 1}`}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{player.username}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {player.phone ? player.phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') : ''}
                  </div>
                </div>
                <div style={{
                  textAlign: 'right',
                  fontWeight: 700,
                  color: i === 0 ? 'gold' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--success-color)'
                }}>
                  KSH {player.balance.toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/game" className="btn btn-primary" style={{ padding: '0.875rem 2.5rem', fontSize: '1.1rem' }}>
            🎮 Play Now
          </Link>
        </div>
      </div>
    </div>
  );
}
