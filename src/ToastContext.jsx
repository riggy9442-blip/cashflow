import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    win: (msg) => addToast(msg, 'win'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        zIndex: 9999,
        pointerEvents: 'none',
        maxWidth: '320px',
        width: '90vw',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '0.875rem 1.25rem',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            animation: 'toastIn 0.3s ease',
            backgroundColor:
              t.type === 'success' ? 'rgba(16, 185, 129, 0.95)' :
              t.type === 'error'   ? 'rgba(239, 68, 68, 0.95)'  :
              t.type === 'win'     ? 'rgba(234, 179, 8, 0.95)'  :
                                     'rgba(30, 30, 40, 0.95)',
            border: t.type === 'win' ? '1px solid gold' : '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            {t.type === 'success' && '✅ '}
            {t.type === 'error'   && '❌ '}
            {t.type === 'win'     && '🎉 '}
            {t.type === 'info'    && 'ℹ️ '}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
