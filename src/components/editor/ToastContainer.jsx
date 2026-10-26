import React, { useState, useEffect } from 'react';
import { EventBus, EDITOR_EVENTS } from '../../core/events/EventBus.js';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = EventBus.on(EDITOR_EVENTS.TOAST_NOTIFY, (toast) => {
      const id = Date.now() + Math.random();
      const item = { id, ...toast };
      setToasts((prev) => [...prev.slice(-4), item]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    });

    return unsub;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            background:
              t.type === 'error'
                ? 'rgba(239, 68, 68, 0.95)'
                : t.type === 'success'
                ? 'rgba(16, 185, 129, 0.95)'
                : 'rgba(30, 41, 59, 0.92)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            transform: 'translateY(0)',
            transition: 'all 0.2s ease',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
