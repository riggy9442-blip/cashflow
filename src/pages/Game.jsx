import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Send } from 'lucide-react';

export default function Game({ user, onUpdateBalance }) {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  
  // Game State
  const [status, setStatus] = useState('WAITING');
  const [multiplier, setMultiplier] = useState('1.00');
  const [countdown, setCountdown] = useState(0);
  const [players, setPlayers] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Betting State
  const [betAmount, setBetAmount] = useState(10);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('gameState', (state) => {
      setStatus(state.status);
      setMultiplier(state.multiplier);
      setPlayers(state.players);
      setHistory(state.history);
      
      if (state.status === 'WAITING') {
        setHasBet(false);
        setCashedOut(false);
        setWinAmount(0);
      }
    });

    newSocket.on('gameCountdown', (count) => {
      setCountdown(count);
    });

    newSocket.on('gameTick', (data) => {
      setMultiplier(data.multiplier);
    });

    newSocket.on('gameCrashed', (data) => {
      setStatus('CRASHED');
      setMultiplier(data.multiplier);
      setPlayers(data.players);
      setHistory(prev => [data.multiplier, ...prev].slice(0, 20));
      if (hasBet && !cashedOut) {
        // Lost
        setHasBet(false);
      }
    });

    newSocket.on('playersUpdate', (p) => setPlayers(p));
    
    newSocket.on('betConfirmed', (amount) => {
      setHasBet(true);
      onUpdateBalance(user.balance - amount);
    });

    newSocket.on('cashOutSuccess', (amount) => {
      setCashedOut(true);
      setWinAmount(amount);
      onUpdateBalance(user.balance + amount);
    });

    newSocket.on('chatHistory', (history) => setChatMessages(history));
    newSocket.on('newMessage', (msg) => setChatMessages(prev => [...prev, msg]));

    return () => newSocket.close();
  }, [user, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const placeBet = () => {
    if (betAmount > user.balance || betAmount <= 0) return alert('Invalid bet amount');
    socket.emit('placeBet', { username: user.username, amount: betAmount });
  };

  const cashOut = () => {
    socket.emit('cashOut');
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('sendMessage', { username: user.username, message: chatInput });
    setChatInput('');
  };

  return (
    <div className="game-layout">
      {/* Main Game Area */}
      <div className="game-main">
        {/* History Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem', backgroundColor: 'var(--bg-panel)', borderRadius: '8px' }}>
          {history.map((m, i) => (
            <span key={i} style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', backgroundColor: parseFloat(m) >= 2 ? 'var(--success-color)' : 'var(--bg-secondary)', fontWeight: 'bold' }}>
              {m}x
            </span>
          ))}
        </div>

        {/* Canvas / Animation Area */}
        <div className={`canvas-container ${status === 'CRASHED' ? 'crash-shake' : ''}`}>
          <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)' }}>
             {status === 'WAITING' && <h2 style={{ color: 'var(--text-secondary)' }}>Waiting for next round... {countdown > 0 && countdown}</h2>}
             {status === 'CRASHED' && <h2 style={{ color: 'var(--accent-color)' }}>CRASHED</h2>}
          </div>
          
          <div className={`multiplier-display ${status === 'CRASHED' ? 'crashed' : ''}`}>
            {multiplier}x
          </div>

          {/* Jet Animation Placeholder */}
          {status === 'IN_PROGRESS' && (
            <div style={{ position: 'absolute', bottom: '20%', left: '20%', fontSize: '4rem', animation: 'flyJet 10s infinite alternate linear', transformOrigin: 'center' }}>
              ✈️
            </div>
          )}
        </div>

        {/* Betting Controls */}
        <div className="betting-controls flex-col">
          <div className="flex justify-center items-center gap-4">
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))} style={{ padding: '1rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>-</button>
              <input 
                type="number" 
                value={betAmount} 
                onChange={(e) => setBetAmount(Number(e.target.value))}
                style={{ width: '80px', textAlign: 'center', background: 'transparent', border: 'none', color: 'white', fontSize: '1.25rem', fontWeight: 'bold', outline: 'none' }}
              />
              <button onClick={() => setBetAmount(betAmount + 10)} style={{ padding: '1rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>+</button>
            </div>
            
            {status === 'WAITING' ? (
              <button 
                className={`btn ${hasBet ? 'btn-secondary' : 'btn-success'}`} 
                style={{ padding: '1rem 3rem', fontSize: '1.5rem', width: '250px' }}
                onClick={placeBet}
                disabled={hasBet}
              >
                {hasBet ? 'Waiting...' : 'BET'}
              </button>
            ) : (
              <button 
                className={`btn btn-primary`} 
                style={{ padding: '1rem 3rem', fontSize: '1.5rem', width: '250px', backgroundColor: cashedOut ? 'var(--bg-secondary)' : 'var(--accent-color)' }}
                onClick={cashOut}
                disabled={status !== 'IN_PROGRESS' || !hasBet || cashedOut}
              >
                {cashedOut ? `Win KSH ${winAmount.toFixed(2)}` : 'CASH OUT'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Chat & Players */}
      <div className="sidebar">
        <div className="chat-header">
          Players ({players.length})
        </div>
        <div style={{ height: '30%', overflowY: 'auto', borderBottom: '1px solid var(--border-color)', padding: '0.5rem' }}>
          {players.map((p, i) => (
            <div key={i} className="flex justify-between items-center" style={{ padding: '0.5rem', backgroundColor: i%2===0?'transparent':'var(--bg-primary)' }}>
              <span>{p.username}</span>
              <span>{p.cashedOut ? <span style={{color: 'var(--success-color)'}}>KSH {p.winnings.toFixed(2)}</span> : `KSH ${p.betAmount}`}</span>
            </div>
          ))}
        </div>
        
        <div className="chat-header">Live Chat</div>
        <div className="chat-messages">
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginRight: '0.5rem' }}>{msg.time}</span>
              <strong style={{ color: 'var(--accent-color)', marginRight: '0.5rem' }}>{msg.username}:</strong>
              <span>{msg.message}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form className="chat-input-container" onSubmit={sendChat}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Type a message..." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
