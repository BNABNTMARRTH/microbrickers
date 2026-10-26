import React, { useState, useEffect } from 'react';
import {
  Move, RotateCw, Paintbrush, Copy, Trash2, X,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Layers
} from 'lucide-react';
import { EditorEngine } from '../../core/engine/EditorEngine.js';
import { EventBus, EDITOR_EVENTS } from '../../core/events/EventBus.js';
import { MATERIALS_PALETTE } from '../../utils/brickGeometries.js';

export default function PieceActionToolbar() {
  const engine = EditorEngine.getInstance();
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [zDepthMode, setZDepthMode] = useState(false);

  useEffect(() => {
    const unsubSel = EventBus.on(EDITOR_EVENTS.PIECE_SELECTED, (data) => {
      setSelectedPiece({ ...data.piece, index: data.index });
    });
    const unsubDesel = EventBus.on(EDITOR_EVENTS.PIECE_DESELECTED, () => {
      setSelectedPiece(null);
    });
    const unsubPieces = EventBus.on(EDITOR_EVENTS.PIECES_UPDATED, () => {
      if (engine.selectedPieceIndex !== null) {
        const p = engine.model.getPiece(engine.selectedPieceIndex);
        if (p) setSelectedPiece({ ...p, index: engine.selectedPieceIndex });
        else setSelectedPiece(null);
      } else {
        setSelectedPiece(null);
      }
    });

    // Detectar Shift o Z mantenido para sincronizar el estado visual del modo profundidad
    const onKeyDown = (e) => {
      if (e.key === 'Shift' || e.key.toLowerCase() === 'z') {
        setZDepthMode(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.key === 'Shift' || e.key.toLowerCase() === 'z') {
        setZDepthMode(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      unsubSel();
      unsubDesel();
      unsubPieces();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [engine]);

  if (!selectedPiece) return null;

  const matConfig = MATERIALS_PALETTE[selectedPiece.m] || { name: selectedPiece.m, color: '#f97316' };

  const handleNudge = (dx, dy, dz) => {
    engine.moveSelectedPieceByNudge(dx, dy, dz);
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(249, 115, 22, 0.4)',
        borderRadius: 14,
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 95,
        boxShadow: '0 12px 36px rgba(0,0,0,0.5), 0 0 20px rgba(249, 115, 22, 0.25)',
      }}
    >
      {/* Indicador de la Pieza */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 10, borderRight: '1px solid rgba(148, 163, 184, 0.2)' }}>
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 4,
            background: matConfig.color,
            boxShadow: '0 0 8px rgba(0,0,0,0.5)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }}>
            {selectedPiece.t}
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>
            [{selectedPiece.p.join(', ')}] · Rot: {(selectedPiece.r || 0) * 90}°
          </span>
        </div>
      </div>

      {/* Control Direccional con Flechas (Nudge Pad) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingRight: 10,
          borderRight: '1px solid rgba(148, 163, 184, 0.2)',
        }}
      >
        <button
          onClick={() => handleNudge(-1, 0, 0)}
          title="Mover Izquierda (←)"
          style={{
            padding: '5px 7px',
            borderRadius: 6,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={13} />
        </button>

        <button
          onClick={() => (zDepthMode ? handleNudge(0, 1, 0) : handleNudge(0, 0, -1))}
          title={zDepthMode ? 'Mover Adelante / Frente (Shift + ↓)' : 'Bajar Altura (↓)'}
          style={{
            padding: '5px 7px',
            borderRadius: 6,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          <ArrowDown size={13} />
        </button>

        <button
          onClick={() => (zDepthMode ? handleNudge(0, -1, 0) : handleNudge(0, 0, 1))}
          title={zDepthMode ? 'Mover Atrás / Fondo (Shift + ↑)' : 'Subir Altura (↑)'}
          style={{
            padding: '5px 7px',
            borderRadius: 6,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          <ArrowUp size={13} />
        </button>

        <button
          onClick={() => handleNudge(1, 0, 0)}
          title="Mover Derecha (→)"
          style={{
            padding: '5px 7px',
            borderRadius: 6,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#e2e8f0',
            cursor: 'pointer',
          }}
        >
          <ArrowRight size={13} />
        </button>

        {/* Botón de alternancia de Eje Z (Profundidad) */}
        <button
          onClick={() => {
            const nextMode = !zDepthMode;
            setZDepthMode(nextMode);
            engine.isZDepthModifier = nextMode;
          }}
          title="Alternar entre Plano Vertical (X/Y) y Plano de Profundidad (Eje Z / Shift)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 8px',
            borderRadius: 6,
            border: zDepthMode ? '1px solid #a855f7' : '1px solid #334155',
            background: zDepthMode ? 'rgba(168, 85, 247, 0.25)' : '#1e293b',
            color: zDepthMode ? '#c084fc' : '#94a3b8',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: 2,
          }}
        >
          <Layers size={13} />
          <span>{zDepthMode ? 'Modo Z (Atrás/Adelante)' : 'Modo Vertical (Altura)'}</span>
        </button>
      </div>

      {/* Botones de Acción */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Arrastrar / Mover */}
        <button
          onClick={() => engine.startDragging()}
          title="Mover pieza con el ratón"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#38bdf8',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Move size={14} />
          <span>Arrastrar</span>
        </button>

        {/* Rotar */}
        <button
          onClick={() => engine.rotateSelectedPiece()}
          title="Rotar 90° (Tecla R)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#fdba74',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RotateCw size={14} />
          <span>Rotar (R)</span>
        </button>

        {/* Pintar */}
        <button
          onClick={() => engine.paintSelectedPiece(engine.toolConfig.material)}
          title="Pintar con el color activo en la paleta"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#f472b6',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Paintbrush size={14} />
          <span>Pintar</span>
        </button>

        {/* Duplicar */}
        <button
          onClick={() => engine.duplicateSelectedPiece()}
          title="Duplicar pieza (Tecla D)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#34d399',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Copy size={14} />
          <span>Duplicar (D)</span>
        </button>

        {/* Eliminar */}
        <button
          onClick={() => engine.deleteSelectedPiece()}
          title="Eliminar pieza (Tecla Supr / Backspace)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Trash2 size={14} />
          <span>Borrar</span>
        </button>

        {/* Deseleccionar */}
        <button
          onClick={() => engine.deselectPiece()}
          title="Deseleccionar (Escape)"
          style={{
            padding: '6px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
