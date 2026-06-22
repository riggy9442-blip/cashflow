import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [activeTab, setActiveTab] = useState('wealth'); // 'wealth' | 'tournaments'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const [resWealth, resTournaments] = await Promise.all([
          fetch('/api/leaderboard'),
          fetch('/api/tournaments')
        ]);
        const dataWealth = await resWealth.json();
        const dataTournaments = await resTournaments.json();
        setLeaders(dataWealth);
        setTournaments(dataTournaments);
      } catch (err) {
        console.error('Failed to fetch leaderboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem', maxWidth: '800px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--accent-color)', textShadow: '0 0 10px rgba(239, 68, 68, 0.3)' }}>
          HALL OF FAME
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>The absolute legends of Cashflow Aviator</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('wealth')}
          style={{ padding: '0.8rem 2rem', fontSize: '1rem', fontWeight: 'bold', background: activeTab === 'wealth' ? 'var(--accent-color)' : 'var(--bg-secondary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s' }}
        >
          💰 Wealth Leaderboard
        </button>
        <button 
          onClick={() => setActiveTab('tournaments')}
          style={{ padding: '0.8rem 2rem', fontSize: '1rem', fontWeight: 'bold', background: activeTab === 'tournaments' ? 'var(--success-color)' : 'var(--bg-secondary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s' }}
        >
          🏆 Weekly Tournaments
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          Loading legends...
        </div>
      ) : (
        <div className="leaderboard-table" style={{ backgroundColor: 'var(--bg-panel)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', padding: '1rem', backgroundColor: 'var(--bg-secondary)', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)' }}>
            <div>Rank</div>
            <div>Player</div>
            <div style={{ textAlign: 'right' }}>{activeTab === 'wealth' ? 'Balance (KSH)' : 'Highest Multiplier'}</div>
          </div>

          {activeTab === 'wealth' ? (
            leaders.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No players yet.</div>
            ) : leaders.map((user, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', padding: '1rem', borderBottom: '1px solid var(--bg-secondary)', alignItems: 'center', backgroundColor: index < 3 ? `rgba(239, 68, 68, ${0.15 - index * 0.05})` : 'transparent' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--text-secondary)' }}>
                  #{index + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {user.level === 'Platinum' ? '💎 ' : user.level === 'Gold' ? '🥇 ' : user.level === 'Silver' ? '🥈 ' : ''}
                    {user.username}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.phone}</div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success-color)' }}>
                  {typeof user.balance === 'number' ? user.balance.toFixed(2) : user.balance}
                </div>
              </div>
            ))
          ) : (
            tournaments.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No tournament data yet. Go hit some multipliers!</div>
            ) : tournaments.map((user, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', padding: '1rem', borderBottom: '1px solid var(--bg-secondary)', alignItems: 'center', backgroundColor: index < 3 ? `rgba(34, 197, 94, ${0.15 - index * 0.05})` : 'transparent' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--text-secondary)' }}>
                  #{index + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {user.level === 'Platinum' ? '💎 ' : user.level === 'Gold' ? '🥇 ' : user.level === 'Silver' ? '🥈 ' : ''}
                    {user.username}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#ffc107', fontSize: '1.2rem', fontFamily: 'monospace' }}>
                  {user.highestMultiplier.toFixed(2)}x
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
