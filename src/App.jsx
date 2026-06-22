import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ToastProvider } from './ToastContext';
import Landing from './pages/Landing';
import Game from './pages/Game';
import Login from './pages/Login';
import Register from './pages/Register';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cashjet_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('cashjet_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('cashjet_user');
  };

  return (
    <ToastProvider>
      <Router>
        <header>
          <div className="container flex justify-between items-center">
            <Link to="/" className="logo">
              <span>✈️</span> CashJet
            </Link>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'nowrap' }}>
              <Link to="/leaderboard" style={{ color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>🏆 Leaderboard</Link>
              {user ? (
                <>
                  <span style={{ 
                    color: 'var(--success-color)', 
                    fontWeight: 700, 
                    fontSize: '0.9rem',
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    border: '1px solid rgba(34,197,94,0.3)',
                    whiteSpace: 'nowrap'
                  }}>
                    KSH {typeof user.balance === 'number' ? user.balance.toFixed(0) : user.balance}
                  </span>
                  <Link to="/game" className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '0.4rem 1rem' }}>Play</Link>
                  <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary">Login</Link>
                  <Link to="/register" className="btn btn-primary">Get KSH 500</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/game" element={<Game user={user} onUpdateBalance={(bal) => setUser(prev => ({...prev, balance: bal}))} />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </Router>
    </ToastProvider>
  );
}

export default App;
