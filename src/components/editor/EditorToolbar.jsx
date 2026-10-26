import React, { useState, useEffect } from 'react';
import { MousePointerClick, Hammer, Paintbrush, Eraser, Eye, Puzzle } from 'lucide-react';
import { EditorEngine } from '../../core/engine/EditorEngine.js';
import { EventBus, EDITOR_EVENTS } from '../../core/events/EventBus.js';

export default function EditorToolbar() {
  const engine = EditorEngine.getInstance();
  const [activeMode, setActiveMode] = useState(() => engine.getMode());

  useEffect(() => {
    const unsub = EventBus.on(EDITOR_EVENTS.STATE_CHANGED, (data) => {
      setActiveMode(data.stateId);
    });
    return unsub;
  }, []);

  const tools = [
    { id: 'select', label: 'Seleccionar / Mover', hotkey: '1', icon: MousePointerClick, color: '#f97316' },
    { id: 'build', label: '+ Construir', hotkey: '2', icon: Hammer, color: '#38bdf8' },
    { id: 'paint', label: 'Pintar', hotkey: '3', icon: Paintbrush, color: '#ec4899' },
    { id: 'erase', label: 'Borrar', hotkey: '4', icon: Eraser, color: '#ef4444' },
    { id: 'inspect', label: 'Órbita', hotkey: '5', icon: Eye, color: '#a78bfa' },
    { id: 'play_assembly', label: 'Juego Armado', hotkey: '6', icon: Puzzle, color: '#10b981' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15, 23, 42, 0.90)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: 14,
        padding: '5px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        zIndex: 90,
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
      }}
    >
      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = activeMode === t.id;

        return (
          <button
            key={t.id}
            onClick={() => engine.setMode(t.id)}
            title={`${t.label} (Tecla ${t.hotkey})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 10,
              border: isActive ? `1px solid ${t.color}` : '1px solid transparent',
              background: isActive
                ? `linear-gradient(135deg, ${t.color}22, ${t.color}44)`
                : 'transparent',
              color: isActive ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              transition: 'all 0.15s ease',
              boxShadow: isActive ? `0 0 16px ${t.color}33` : 'none',
            }}
          >
            <Icon size={16} color={isActive ? t.color : '#94a3b8'} />
            <span>{t.label}</span>
            <span
              style={{
                fontSize: 10,
                opacity: 0.6,
                padding: '1px 5px',
                borderRadius: 4,
                background: 'rgba(0,0,0,0.3)',
              }}
            >
              {t.hotkey}
            </span>
          </button>
        );
      })}
    </div>
  );
}
