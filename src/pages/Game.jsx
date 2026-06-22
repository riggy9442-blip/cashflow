import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Send } from 'lucide-react';
import { useToast } from '../ToastContext';

function BetPanel({ panelId, socket, status, user, multiplier, onWin, onBetPlaced }) {
  const toast = useToast();
  const [betAmount, setBetAmount] = useState(10);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  
  const [autoBet, setAutoBet] = useState(false);
  const [autoCashOut, setAutoCashOut] = useState(false);
  const [targetMultiplier, setTargetMultiplier] = useState(2.00);

  const placeBet = () => {
    if (betAmount > user.balance || betAmount <= 0) return toast.error('Invalid bet amount');
    socket.emit('placeBet', { 
      username: user.username, 
      amount: betAmount, 
      panelId,
      autoCashOut: autoCashOut ? targetMultiplier : null
    });
  };

  const cashOut = () => {
    socket.emit('cashOut', { username: user.username, panelId });
  };

  // Auto Bet Logic
  useEffect(() => {
    if (status === 'WAITING' && autoBet && !hasBet) {
      const timer = setTimeout(() => {
        placeBet();
      }, 1000 + Math.random() * 2000);
      return () => clearTimeout(timer);
    }
    if (status === 'WAITING') {
      setCashedOut(false);
      setWinAmount(0);
    }
  }, [status, autoBet, hasBet]);

  // Auto Cashout Logic
  useEffect(() => {
    if (status === 'IN_PROGRESS' && hasBet && !cashedOut && autoCashOut) {
      if (parseFloat(multiplier) >= targetMultiplier) {
        cashOut();
      }
    }
  }, [multiplier, status, hasBet, cashedOut, autoCashOut, targetMultiplier]);

  // Listen to socket specifically for this panel
  useEffect(() => {
    if (!socket) return;
    
    const handleBetConfirmed = (data) => {
      if (data.panelId === panelId && data.username === user.username) {
        setHasBet(true);
        toast.info(`Bet of KSH ${data.amount} placed!`);
      }
    };
    
    const handleCashOutSuccess = (data) => {
      if (data.panelId === panelId && data.username === user.username) {
        setCashedOut(true);
        setWinAmount(data.amount);
        toast.win(`Won KSH ${data.amount.toFixed(2)}! 🎉`);
      }
    };
    
    const handleGameCrashed = () => {
      if (hasBet && !cashedOut) {
        setHasBet(false);
      }
    };

    socket.on('betConfirmed', handleBetConfirmed);
    socket.on('cashOutSuccess', handleCashOutSuccess);
    socket.on('gameCrashed', handleGameCrashed);
    
    return () => {
      socket.off('betConfirmed', handleBetConfirmed);
      socket.off('cashOutSuccess', handleCashOutSuccess);
      socket.off('gameCrashed', handleGameCrashed);
    };
  }, [socket, panelId, user.username, hasBet, cashedOut]);

  return (
    <div className="bet-panel flex-col gap-2" style={{ backgroundColor: 'var(--bg-panel)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1 }}>
      {/* Toggles */}
      <div className="flex justify-between items-center" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoBet} onChange={e => setAutoBet(e.target.checked)} /> Auto Bet
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoCashOut} onChange={e => setAutoCashOut(e.target.checked)} /> Auto Cashout
          {autoCashOut && (
            <input type="number" step="0.1" value={targetMultiplier} onChange={e => setTargetMultiplier(parseFloat(e.target.value))} style={{ width: '60px', padding: '0.2rem', background: 'var(--bg-primary)', color: 'white', border: '1px solid var(--border-color)' }} />
          )}
        </label>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))} disabled={hasBet && status !== 'WAITING'} style={{ padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>-</button>
          <input 
            type="number" 
            value={betAmount} 
            onChange={(e) => setBetAmount(Number(e.target.value))}
            disabled={hasBet && status !== 'WAITING'}
            style={{ width: '60px', textAlign: 'center', background: 'transparent', border: 'none', color: 'white', fontSize: '1.25rem', fontWeight: 'bold', outline: 'none' }}
          />
          <button onClick={() => setBetAmount(betAmount + 10)} disabled={hasBet && status !== 'WAITING'} style={{ padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>+</button>
        </div>
        
        {status === 'WAITING' ? (
          <button 
            className={`btn ${hasBet ? 'btn-secondary' : 'btn-success'}`} 
            style={{ padding: '1rem', fontSize: '1.25rem', flex: 1 }}
            onClick={placeBet}
            disabled={hasBet}
          >
            {hasBet ? 'Waiting...' : 'BET'}
          </button>
        ) : (
          <button 
            className={`btn btn-primary`} 
            style={{ padding: '1rem', fontSize: '1.25rem', flex: 1, backgroundColor: cashedOut ? 'var(--bg-secondary)' : 'var(--accent-color)' }}
            onClick={cashOut}
            disabled={status !== 'IN_PROGRESS' || !hasBet || cashedOut}
          >
            {cashedOut ? `Win KSH ${winAmount.toFixed(2)}` : 'CASH OUT'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Game({ user, onUpdateBalance }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  
  // Game State
  const [status, setStatus] = useState('WAITING');
  const [multiplier, setMultiplier] = useState('1.00');
  const [countdown, setCountdown] = useState(0);
  const [players, setPlayers] = useState([]);
  const [history, setHistory] = useState([]);
  const [jackpot, setJackpot] = useState(0);
  const [serverHash, setServerHash] = useState('');
  const [serverSeed, setServerSeed] = useState(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Audio refs
  const tickAudioRef = useRef(null);
  const crashAudioRef = useRef(null);
  const cashOutAudioRef = useRef(null);

  useEffect(() => {
    if (!userRef.current) {
      navigate('/login');
      return;
    }

    // Synthesize simple audio context for sounds without needing external files
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const actx = new AudioContext();
      
      const playBeep = (freq, type, duration, vol) => {
        if (actx.state === 'suspended') actx.resume();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        gain.gain.setValueAtTime(vol, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + duration);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + duration);
      };

      tickAudioRef.current = (multiplier) => {
        // Engine hum rising in pitch
        const baseFreq = 150;
        const freq = baseFreq + (Math.log(multiplier || 1) * 100);
        playBeep(freq, 'square', 0.08, 0.03);
      };
      
      crashAudioRef.current = () => {
        // Explosion swoosh
        playBeep(100, 'sawtooth', 0.8, 0.3);
        setTimeout(() => playBeep(50, 'square', 0.4, 0.2), 100);
      };
      
      cashOutAudioRef.current = () => {
        // Cha-ching!
        playBeep(1200, 'sine', 0.1, 0.1);
        setTimeout(() => playBeep(1600, 'sine', 0.3, 0.15), 100);
      };
    } catch (e) {
      console.log('Web Audio not supported');
    }

    const newSocket = io();
    setSocket(newSocket);

    // Fetch fresh balance from server on mount to prevent stale localStorage data
    fetch(`/api/balance/${userRef.current.username}`)
      .then(r => r.json())
      .then(data => { if (data.balance !== undefined) onUpdateBalance(data.balance); })
      .catch(() => {});

    newSocket.on('gameState', (state) => {
      setStatus(state.status);
      setMultiplier(state.multiplier);
      setPlayers(state.players);
      setHistory(state.history);
      setServerHash(state.serverHash || '');
      setServerSeed(state.serverSeed || null);
    });

    newSocket.on('gameCountdown', (count) => {
      setCountdown(count);
    });

    newSocket.on('gameTick', (data) => {
      setMultiplier(data.multiplier);
      if (tickAudioRef.current && Math.random() > 0.5) tickAudioRef.current(parseFloat(data.multiplier));
    });

    newSocket.on('gameCrashed', (data) => {
      setStatus('CRASHED');
      setMultiplier(data.multiplier);
      setPlayers(data.players);
      setServerSeed(data.serverSeed);
      setHistory(prev => [data.multiplier, ...prev].slice(0, 20));
      if (crashAudioRef.current) crashAudioRef.current();
      toast.error(`Flew away at ${data.multiplier}x!`);
    });

    newSocket.on('playersUpdate', (p) => setPlayers(p));
    
    newSocket.on('betConfirmed', (data) => {
      if (data.username === userRef.current.username) {
        onUpdateBalance(userRef.current.balance - data.amount);
      }
    });

    newSocket.on('cashOutSuccess', (data) => {
      if (data.username === userRef.current.username) {
        // Use server-confirmed new balance to avoid stale ref bugs
        if (data.newBalance !== undefined) {
          onUpdateBalance(data.newBalance);
        } else {
          onUpdateBalance(userRef.current.balance + data.amount);
        }
        if (cashOutAudioRef.current) cashOutAudioRef.current();
      }
    });    newSocket.on('betFailed', (reason) => {
      toast.error('Bet Failed: ' + reason);
    });

    newSocket.on('chatHistory', (history) => setChatMessages(history));
    newSocket.on('newMessage', (msg) => setChatMessages(prev => [...prev, msg]));
    newSocket.on('jackpotUpdate', (amount) => setJackpot(amount));

    return () => newSocket.close();
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('sendMessage', { username: user.username, message: chatInput });
    setChatInput('');
  };

  // SVG Curve Math — sqrt on X (fast early movement), log on Y (height scale)
  const getCurvePos = (mult) => {
    const m = Math.max(mult, 1.001);
    // X: square-root gives fast early movement (most rounds end at 1x-3x)
    const xProgress = Math.min(Math.sqrt((m - 1) / 29), 1.0);
    const x = xProgress * 86 + 3;
    // Y: log scale for proper height representation
    const yProgress = Math.min(Math.log(m) / Math.log(30), 1.0);
    const y = 93 - yProgress * 86;
    return { x, y, xProgress };
  };

  const drawPath = () => {
    if (status === 'WAITING') return 'M 0 93 L 3 93';
    const mult = parseFloat(multiplier);
    const { x, y } = getCurvePos(mult);
    return `M 0 93 C ${x * 0.2} 93, ${x * 0.6} ${y + 20}, ${x} ${y}`;
  };

  const planePos = () => {
    if (status === 'WAITING') return { x: 3, y: 93, rotate: 0 };
    const mult = parseFloat(multiplier);
    const { x, y, xProgress } = getCurvePos(mult);
    return { x, y, rotate: -Math.min(xProgress * 42, 40) };
  };

  const pos = planePos();

  if (!user) return null;

  return (
    <div className="game-layout">
      {/* Main Game Area */}
      <div className="game-main flex-col">
        {/* History Bar - fixed height so it never shifts the canvas */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          overflowX: 'auto', 
          padding: '0.5rem', 
          backgroundColor: 'var(--bg-panel)', 
          borderRadius: '8px',
          minHeight: '40px',
          maxHeight: '40px',
          flexShrink: 0,
          alignItems: 'center',
          scrollbarWidth: 'none'
        }}>
          {history.map((m, i) => (
            <span key={i} style={{ 
              padding: '0.2rem 0.6rem', 
              borderRadius: '4px', 
              backgroundColor: parseFloat(m) >= 2 ? 'var(--success-color)' : 'rgba(239,68,68,0.3)', 
              fontWeight: 'bold',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {m}x
            </span>
          ))}
        </div>

        {/* Canvas / Animation Area */}
        <div className={`canvas-container ${status === 'CRASHED' ? 'crash-shake' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
          
          {/* Jackpot Banner */}
          {jackpot > 0 && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 193, 7, 0.2)', color: '#ffc107', textAlign: 'center', padding: '0.2rem', fontWeight: 'bold', fontSize: '0.9rem', zIndex: 10, display: 'flex', justifyContent: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255, 193, 7, 0.4)' }}>
              <span>🏆 PROGRESSIVE JACKPOT:</span>
              <span style={{ fontFamily: 'monospace' }}>{jackpot.toFixed(2)} KSH</span>
            </div>
          )}

          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <path 
              d={drawPath()} 
              fill="none" 
              stroke="var(--accent-color)" 
              strokeWidth="2" 
              style={{ transition: 'd 0.1s linear' }}
            />
            {/* Fill under the curve */}
            <path 
              d={`M 0 93 C ${(() => { const {x,y} = getCurvePos(parseFloat(multiplier)); return `${x*0.25} 93, ${x*0.65} ${y+18}, ${x} ${y} L ${x} 93 L 0 93 Z`; })()}`} 
              fill="rgba(233, 69, 96, 0.12)" 
            />
          </svg>

          <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
             {status === 'WAITING' && <h2 style={{ color: 'var(--text-secondary)' }}>Waiting for next round... {countdown > 0 && countdown}</h2>}
             {status === 'CRASHED' && <h2 style={{ color: 'var(--accent-color)' }}>FLEW AWAY</h2>}
          </div>
          
          <div className={`multiplier-display ${status === 'CRASHED' ? 'crashed' : ''}`} style={{ zIndex: 10 }}>
            {multiplier}x
          </div>

          {/* Jet Vector Animation */}
          {status !== 'WAITING' && (
            <div style={{ 
              position: 'absolute', 
              bottom: `${100 - pos.y}%`, 
              left: `${pos.x}%`, 
              fontSize: '3rem', 
              transform: `translate(-50%, 50%) rotate(${status === 'CRASHED' ? '90deg' : pos.rotate + 'deg'})`, 
              transition: status === 'CRASHED' ? 'all 0.5s ease-out' : 'all 0.1s linear',
              opacity: status === 'CRASHED' ? 0 : 1,
              zIndex: 20
            }}>
              ✈️
            </div>
          )}

          {/* Provably Fair Info */}
          <div style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)', zIndex: 10, textAlign: 'right', backgroundColor: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
            <div style={{ opacity: 0.7 }}>Provably Fair 🛡️</div>
            <div>Hash: <span style={{fontFamily: 'monospace'}}>{serverHash.slice(0, 16)}...</span></div>
            {serverSeed && <div>Seed: <span style={{fontFamily: 'monospace', color: 'var(--success-color)'}}>{serverSeed.slice(0, 16)}...</span></div>}
          </div>
        </div>

        {/* Dual Betting Controls */}
        <div className="flex gap-4" style={{ marginTop: 'auto' }}>
          <BetPanel panelId={1} socket={socket} status={status} user={user} multiplier={multiplier} />
          <BetPanel panelId={2} socket={socket} status={status} user={user} multiplier={multiplier} />
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
          {chatMessages.map((msg, i) => {
            const isSystem = msg.username === 'SYSTEM';
            return (
              <div key={i} style={{ fontSize: '0.9rem', backgroundColor: isSystem ? 'rgba(255,193,7,0.1)' : 'transparent', padding: isSystem ? '0.25rem' : '0', borderRadius: '4px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginRight: '0.5rem' }}>{msg.time}</span>
                {msg.level && msg.level !== 'Bronze' && !isSystem && (
                  <span style={{ fontSize: '0.75rem', marginRight: '0.3rem', padding: '0.1rem 0.3rem', borderRadius: '4px', backgroundColor: msg.level === 'Platinum' ? '#e5e4e2' : msg.level === 'Gold' ? '#ffd700' : '#c0c0c0', color: '#000', fontWeight: 'bold' }}>
                    {msg.level === 'Platinum' ? '💎' : msg.level === 'Gold' ? '🥇' : '🥈'}
                  </span>
                )}
                <strong style={{ color: isSystem ? '#ffc107' : 'var(--accent-color)', marginRight: '0.5rem' }}>{msg.username}:</strong>
                <span style={{ color: isSystem ? '#ffc107' : 'inherit', fontWeight: isSystem ? 'bold' : 'normal' }}>{msg.message}</span>
              </div>
            );
          })}
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
