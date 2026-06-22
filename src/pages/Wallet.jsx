import { useState, useEffect } from 'react';
import { LucideWallet, LucideUsers, LucideArrowUpRight, LucideArrowDownLeft, LucideGift, LucideCopy, LucideCheckCircle } from 'lucide-react';

export default function Wallet({ user }) {
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [referrals, setReferrals] = useState({ count: 0, earned: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState(user.balance);

  // Deposit / Withdraw State
  const [actionType, setActionType] = useState(null); // 'deposit' | 'withdraw' | null
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(user.phone || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [user.username, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'transactions') {
        const res = await fetch(`/api/transactions/${user.username}`);
        const data = await res.json();
        if (Array.isArray(data)) setTransactions(data);
        
        // Also fetch latest balance
        const bRes = await fetch(`/api/balance/${user.username}`);
        const bData = await bRes.json();
        if (bData.balance !== undefined) setBalance(bData.balance);
      } else {
        const res = await fetch(`/api/referrals/${user.username}`);
        const data = await res.json();
        if (data.count !== undefined) setReferrals(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${user.username}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTxIcon = (type) => {
    switch(type) {
      case 'bet': return <LucideArrowUpRight className="tx-icon-bet" size={20} />;
      case 'win': return <LucideArrowDownLeft className="tx-icon-win" size={20} />;
      case 'deposit': return <LucideArrowDownLeft className="tx-icon-deposit" size={20} />;
      case 'withdraw': return <LucideArrowUpRight className="tx-icon-withdraw" size={20} />;
      case 'referral_commission': return <LucideGift className="tx-icon-gift" size={20} />;
      default: return <LucideWallet size={20} />;
    }
  };

  const getTxColor = (type) => {
    if (['bet', 'withdraw'].includes(type)) return 'var(--accent-color)'; // red
    return 'var(--success-color)'; // green
  };

  const formatType = (type) => {
    if (type === 'referral_commission') return 'Referral Bonus';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) < 10) return alert('Minimum amount is KSH 10');
    if (!phone) return alert('Phone number required');

    setIsProcessing(true);
    setActionMessage(actionType === 'deposit' ? 'Awaiting M-Pesa STK Prompt on your phone...' : 'Processing withdrawal to M-Pesa...');
    
    try {
      const res = await fetch(`/api/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, amount: Number(amount), phoneNumber: phone })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Transaction failed');
      
      setActionMessage('Success! ✅');
      setBalance(data.newBalance);
      setTimeout(() => {
        setActionType(null);
        setAmount('');
        setIsProcessing(false);
        setActionMessage('');
        fetchData(); // Refresh tx list
      }, 2000);
    } catch (err) {
      alert(err.message);
      setIsProcessing(false);
      setActionMessage('');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="wallet-header">
        <h1>Your Wallet</h1>
        <div className="wallet-balance-card">
          <p>Available Balance</p>
          <h2>KSH {typeof balance === 'number' ? balance.toFixed(2) : balance}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-success" onClick={() => setActionType('deposit')}>Deposit</button>
            <button className="btn btn-secondary" onClick={() => setActionType('withdraw')}>Withdraw</button>
          </div>
        </div>
      </div>

      {actionType && (
        <div className="action-card" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--accent-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: actionType === 'deposit' ? 'var(--success-color)' : 'var(--accent-color)' }}>
              {actionType === 'deposit' ? 'Deposit via M-Pesa' : 'Withdraw to M-Pesa'}
            </h3>
            <button onClick={() => !isProcessing && setActionType(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
          </div>
          
          {isProcessing ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{actionMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleTransaction} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>M-Pesa Number</label>
                <input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX..." required />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Amount (KSH)</label>
                <input type="number" className="form-control" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Min 10" min="10" required />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className={`btn ${actionType === 'deposit' ? 'btn-success' : 'btn-primary'}`} style={{ padding: '0.8rem 2rem' }}>
                  {actionType === 'deposit' ? 'Pay Now' : 'Cash Out'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <LucideWallet size={18} /> Transactions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          <LucideUsers size={18} /> Referrals
        </button>
      </div>

      <div className="tab-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading...</div>
        ) : activeTab === 'transactions' ? (
          <div className="transactions-list">
            {transactions.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No transactions yet.</p>
            ) : (
              transactions.map((tx, i) => (
                <div key={i} className="transaction-item">
                  <div className="tx-left">
                    <div className="tx-icon" style={{ color: getTxColor(tx.type) }}>
                      {getTxIcon(tx.type)}
                    </div>
                    <div>
                      <p className="tx-type">{formatType(tx.type)}</p>
                      <p className="tx-date">{new Date(tx.createdAt || tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="tx-right">
                    <p style={{ color: getTxColor(tx.type), fontWeight: 'bold' }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} KSH
                    </p>
                    {tx.metadata?.multiplier && (
                      <p className="tx-meta" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'right' }}>
                        @{tx.metadata.multiplier}x
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="referral-section">
            <div className="ref-stats">
              <div className="stat-box">
                <h3>Total Referred</h3>
                <p>{referrals.count} Friends</p>
              </div>
              <div className="stat-box">
                <h3>Total Commission</h3>
                <p style={{ color: 'var(--success-color)' }}>{referrals.earned.toFixed(2)} KSH</p>
              </div>
            </div>

            <div className="ref-link-card">
              <h3>Your Invite Link</h3>
              <p>Share this link to earn 1% commission every time your friends play!</p>
              <div className="ref-input-group">
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/register?ref=${user.username}`} 
                  className="form-control"
                />
                <button className="btn btn-primary" onClick={copyReferralLink}>
                  {copied ? <LucideCheckCircle size={18} /> : <LucideCopy size={18} />} 
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .wallet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .wallet-balance-card { background: var(--bg-panel); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); text-align: right; min-width: 300px; }
        .wallet-balance-card p { color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.9rem; }
        .wallet-balance-card h2 { color: var(--success-color); font-size: 2rem; }
        .btn-success { background-color: var(--success-color); color: white; border: none; }
        .btn-success:hover { filter: brightness(1.1); }
        
        .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-left-color: var(--success-color); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .tabs { display: flex; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
        .tab-btn { display: flex; align-items: center; gap: 0.5rem; background: none; border: none; color: var(--text-secondary); font-size: 1rem; font-weight: 600; cursor: pointer; padding: 0.5rem 1rem; transition: all 0.2s; border-radius: 8px; }
        .tab-btn:hover { background: rgba(255,255,255,0.05); color: white; }
        .tab-btn.active { background: var(--bg-panel); color: var(--accent-color); border: 1px solid var(--border-color); }
        
        .transaction-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-panel); margin-bottom: 0.5rem; border-radius: 8px; border: 1px solid var(--border-color); }
        .tx-left { display: flex; align-items: center; gap: 1rem; }
        .tx-icon { background: var(--bg-secondary); padding: 0.5rem; border-radius: 50%; display: flex; }
        .tx-type { font-weight: 600; margin-bottom: 0.2rem; }
        .tx-date { font-size: 0.8rem; color: var(--text-secondary); }
        
        .ref-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
        .stat-box { background: var(--bg-panel); padding: 2rem; border-radius: 12px; border: 1px solid var(--border-color); text-align: center; }
        .stat-box h3 { color: var(--text-secondary); font-size: 1rem; margin-bottom: 1rem; }
        .stat-box p { font-size: 2rem; font-weight: bold; }
        
        .ref-link-card { background: var(--bg-panel); padding: 2rem; border-radius: 12px; border: 1px solid var(--border-color); }
        .ref-link-card p { color: var(--text-secondary); margin-top: 0.5rem; margin-bottom: 1.5rem; }
        .ref-input-group { display: flex; gap: 0.5rem; }
        
        @media (max-width: 600px) {
          .wallet-header { flex-direction: column; align-items: flex-start; }
          .wallet-balance-card { width: 100%; text-align: left; }
          .ref-stats { grid-template-columns: 1fr; }
          .ref-input-group { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
