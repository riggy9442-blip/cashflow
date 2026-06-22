import { Link } from 'react-router-dom';
import { PlayCircle, ShieldCheck, Zap, Users } from 'lucide-react';

export default function Landing() {
  return (
    <div>
      <section className="hero">
        <div className="container">
          <h1>Experience the Thrill of Aviator</h1>
          <p>The premier crash game where skill meets fortune. Watch your multiplier soar and cash out before the plane crashes!</p>
          <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.25rem', padding: '1rem 2rem' }}>
            Play Now & Get KSH 500 Bonus
          </Link>
          
          <div className="stats">
            <div className="stat-item">
              <h3>50,000+</h3>
              <p>Active Players</p>
            </div>
            <div className="stat-item">
              <h3>KSH 2M+</h3>
              <p>Daily Payouts</p>
            </div>
            <div className="stat-item">
              <h3>8.5x</h3>
              <p>Avg Multiplier</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: '4rem 2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2.5rem' }}>Why Play CashJet?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div className="auth-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <Zap size={48} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '1rem' }}>Instant Withdrawals</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Deductions clear instantly. Receive your payouts straight to your M-Pesa wallet with zero delay.</p>
          </div>
          <div className="auth-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <ShieldCheck size={48} color="var(--success-color)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '1rem' }}>Secure & Fair</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Provably fair gaming with transparent crash points, hash verifications, and secure accounts.</p>
          </div>
          <div className="auth-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <Users size={48} color="#3b82f6" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '1rem' }}>Live Community</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Play alongside thousands of active players, chat in real-time, and watch mutual bets.</p>
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: 'var(--bg-panel)', padding: '5rem 0' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Ready to Start Winning?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.2rem' }}>Join thousands of winning players today and claim your registration bonus.</p>
          <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.25rem', padding: '1rem 2rem' }}>
            Get KSH 500 Bonus Now
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '3rem 0', marginTop: '2rem' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <div className="logo" style={{ marginBottom: '1rem' }}><span>✈️</span> CashJet</div>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>The most advanced Aviator crash game experience with instant M-Pesa payouts.</p>
          </div>
          <div style={{ display: 'flex', gap: '3rem' }}>
            <div className="flex-col gap-4">
              <h4 style={{ color: 'white' }}>About</h4>
              <Link to="/" style={{ color: 'var(--text-secondary)' }}>About Us</Link>
              <Link to="/" style={{ color: 'var(--text-secondary)' }}>Blog</Link>
            </div>
            <div className="flex-col gap-4">
              <h4 style={{ color: 'white' }}>Legal</h4>
              <Link to="/" style={{ color: 'var(--text-secondary)' }}>Terms & Conditions</Link>
              <Link to="/" style={{ color: 'var(--text-secondary)' }}>Privacy Policy</Link>
            </div>
            <div className="flex-col gap-4">
              <h4 style={{ color: 'white' }}>Support</h4>
              <Link to="/" style={{ color: 'var(--text-secondary)' }}>Contact Us</Link>
              <Link to="/" style={{ color: 'var(--text-secondary)' }}>FAQ</Link>
            </div>
          </div>
        </div>
        <div className="container" style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          © 2026 CashJet. All rights reserved. Play responsibly.
        </div>
      </footer>
    </div>
  );
}
