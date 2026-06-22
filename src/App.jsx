import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ToastProvider } from './ToastContext';
import Landing from './pages/Landing';
import Game from './pages/Game';
import Login from './pages/Login';
import Register from './pages/Register';
import Leaderboard from './pages/Leaderboard';

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
            <nav className="flex gap-2 items-center" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link to="/leaderboard" style={{ marginRight: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>🏆 Leaderboard</Link>
              {user ? (
                <>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <strong style={{ color: 'var(--success-color)' }}>KSH {typeof user.balance === 'number' ? user.balance.toFixed(0) : user.balance}</strong>
                  </span>
                  <Link to="/game" className="btn btn-primary">Play</Link>
                  <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Logout</button>
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
          </Routes>
        </main>
      </Router>
    </ToastProvider>
  );
}

export default App;
