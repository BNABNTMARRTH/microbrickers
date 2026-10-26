import React, { useState, useEffect } from 'react';
import {
  Play, Pause, RotateCcw, ChevronUp, ChevronDown,
  Layers, Flame, Activity
} from 'lucide-react';
import { EditorEngine } from '../../core/engine/EditorEngine.js';
import { EventBus, EDITOR_EVENTS } from '../../core/events/EventBus.js';
import { SUBASSEMBLY_GROUPS } from '../../utils/brickGeometries.js';

export default function AssemblyGuidePanel() {
  const engine = EditorEngine.getInstance();
  const [maxLayer, setMaxLayerState] = useState(() => engine.maxLayer);
  const [activeGroup, setActiveGroupState] = useState(() => engine.activeGroup);
  const [explosion, setExplosionState] = useState(() => engine.explosion);
  const [isPlaying, setIsPlaying] = useState(() => engine.isPlayingExplosion);
  const [strategyKey, setStrategyKey] = useState('SUBASSEMBLY');
  const [isOpen, setIsOpen] = useState(true);
  const [pieces, setPieces] = useState(() => engine.model.getAllPieces());

  useEffect(() => {
    const unsubLayer = EventBus.on(EDITOR_EVENTS.LAYER_CHANGED, (d) => setMaxLayerState(d.maxLayer));
    const unsubGroup = EventBus.on(EDITOR_EVENTS.ACTIVE_GROUP_CHANGED, (d) => setActiveGroupState(d.activeGroup));
    const unsubExp = EventBus.on(EDITOR_EVENTS.EXPLOSION_CHANGED, (d) => {
      setExplosionState(d.explosion);
      setIsPlaying(d.isPlaying);
    });
    const unsubPieces = EventBus.on(EDITOR_EVENTS.PIECES_UPDATED, (d) => {
      setPieces(d.pieces);
    });

    return () => {
      unsubLayer();
      unsubGroup();
      unsubExp();
      unsubPieces();
    };
  }, []);

  const availableGroups = React.useMemo(() => {
    const pieceGroups = new Set(pieces.map((p) => p.g));
    const list = Object.entries(SUBASSEMBLY_GROUPS).filter(([k]) => k === 'ALL' || pieceGroups.has(k));
    return list.length > 1 ? list : Object.entries(SUBASSEMBLY_GROUPS);
  }, [pieces]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: 16,
        width: isOpen ? 320 : 44,
        background: 'rgba(15, 23, 42, 0.90)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(148, 163, 184, 0.20)',
        borderRadius: 14,
        padding: isOpen ? 16 : 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 85,
        boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
        transition: 'width 0.2s ease, padding 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Header del Panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={16} color="#38bdf8" />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Guía de Capas y Cinemática
            </h2>
          </div>
        )}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          title={isOpen ? 'Contraer panel' : 'Expandir panel'}
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 7,
            padding: 4,
            color: '#94a3b8',
            cursor: 'pointer',
            marginLeft: isOpen ? 0 : 'auto',
          }}
        >
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* CONTROL DE CAPAS (INSTRUCTIVO) */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.65)',
              padding: 10,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd' }}>
                Instructivo por Capas (Z)
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(59, 130, 246, 0.25)',
                  color: '#60a5fa',
                }}
              >
                Capa {maxLayer} / 35
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="35"
              step="1"
              value={maxLayer}
              onChange={(e) => engine.setMaxLayer(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                onClick={() => engine.setMaxLayer(Math.max(0, maxLayer - 1))}
                style={{
                  flex: 1,
                  padding: '5px',
                  borderRadius: 6,
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#cbd5e1',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                -1 Capa
              </button>
              <button
                onClick={() => engine.setMaxLayer(Math.min(35, maxLayer + 1))}
                style={{
                  flex: 1,
                  padding: '5px',
                  borderRadius: 6,
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#cbd5e1',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                +1 Capa
              </button>
              <button
                onClick={() => engine.setMaxLayer(35)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: '1px solid #3b82f6',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#93c5fd',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Todas
              </button>
            </div>
          </div>

          {/* SUB-ENSAMBLES ANATÓMICOS */}
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
              Aislar Sub-ensamble Anatómico:
            </label>
            <select
              value={activeGroup}
              onChange={(e) => engine.setActiveGroup(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                background: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                fontSize: 12,
              }}
            >
              {availableGroups.map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* DESMONTAJE Y EXPLOSIÓN CINEMÁTICA */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.65)',
              padding: 10,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fdba74', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Flame size={14} />
                Desmontaje en Explosión
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }}>
                {Math.round(explosion * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={explosion}
              onChange={(e) => {
                if (isPlaying) engine.togglePlayExplosion();
                engine.setExplosion(parseFloat(e.target.value));
              }}
              style={{ width: '100%', accentColor: '#f97316', cursor: 'pointer' }}
            />

            {/* Selector de Patrón Strategy de Explosión */}
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                Estrategia Cinemática (Strategy Pattern):
              </label>
              <select
                value={strategyKey}
                onChange={(e) => {
                  setStrategyKey(e.target.value);
                  engine.setExplosionStrategy(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '5px 8px',
                  borderRadius: 6,
                  background: '#1e293b',
                  color: '#fdba74',
                  border: '1px solid #334155',
                  fontSize: 11,
                }}
              >
                <option value="SUBASSEMBLY">Anatómica (Sub-ensambles)</option>
                <option value="RADIAL">Dispersión Radial Cilíndrica</option>
                <option value="SEQUENTIAL">Cascada Cinemática de Montaje</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button
                onClick={() => engine.togglePlayExplosion()}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 7,
                  border: 'none',
                  background: isPlaying ? '#ef4444' : '#f97316',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                <span>{isPlaying ? 'Pausar' : 'Animar'}</span>
              </button>

              <button
                onClick={() => {
                  if (isPlaying) engine.togglePlayExplosion();
                  engine.setExplosion(0.0);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: 7,
                  border: '1px solid #475569',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={12} />
                <span>Armar 100%</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
