import React, { useState, useEffect, useRef } from 'react';
import {
  Undo2, Redo2, FolderOpen, Download,
  Layers, Sparkles, Trash2, Box
} from 'lucide-react';
import { EditorEngine } from '../../core/engine/EditorEngine.js';
import { EventBus, EDITOR_EVENTS } from '../../core/events/EventBus.js';
import foxData from '../../data/foxModel.json';
import supercarData from '../../data/presets/supercarModel.json';

export default function EditorHeader({ onOpenBOM }) {
  const engine = EditorEngine.getInstance();
  const [pieceCount, setPieceCount] = useState(() => engine.model.getCount());
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [selectedPreset, setSelectedPreset] = useState('supercar');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubPieces = EventBus.on(EDITOR_EVENTS.PIECES_UPDATED, (data) => {
      setPieceCount(data.pieces.length);
    });
    const unsubHist = EventBus.on(EDITOR_EVENTS.HISTORY_CHANGED, (h) => {
      setHistory(h);
    });
    const unsubModel = EventBus.on(EDITOR_EVENTS.MODEL_LOADED, (d) => {
      if (d.name?.includes('Supercar') || d.name?.includes('Corsa')) setSelectedPreset('supercar');
      else if (d.name?.includes('Zorro')) setSelectedPreset('fox');
      else setSelectedPreset('custom');
    });

    return () => {
      unsubPieces();
      unsubHist();
      unsubModel();
    };
  }, []);

  const handlePresetChange = (e) => {
    const val = e.target.value;
    setSelectedPreset(val);
    if (val === 'supercar') engine.loadPreset(supercarData, 'Supercar Corsa GT');
    else if (val === 'fox') engine.loadPreset(foxData, 'Zorro Rojo');
    else if (val === 'empty') engine.clearCanvas();
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      engine.importJSON(file);
      e.target.value = '';
    }
  };

  return (
    <header
      style={{
        position: 'absolute',
        top: 14,
        left: 16,
        right: 16,
        height: 52,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(148, 163, 184, 0.18)',
        borderRadius: 12,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Lado Izquierdo: Marca y Contador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #ea580c, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Box size={18} />
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.2px' }}>
              MicroBricks 3D Studio
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          <b>{pieceCount.toLocaleString()}</b> micro-piezas
        </div>
      </div>

      {/* Centro: Presets & Undo / Redo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Selector de Modelos Predefinidos */}
        <select
          value={selectedPreset}
          onChange={handlePresetChange}
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <option value="supercar">Supercar Corsa GT (2,588 pcs)</option>
          <option value="fox">Zorro Rojo (1,357 pcs)</option>
          <option value="empty">Lienzo Vacío</option>
          <option value="custom" disabled hidden>Modelo en Edición</option>
        </select>

        {/* Deshacer (Undo) */}
        <button
          title="Deshacer (Ctrl+Z / Cmd+Z)"
          disabled={!history.canUndo}
          onClick={() => engine.undo()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: history.canUndo ? '#1e293b' : 'rgba(30, 41, 59, 0.4)',
            color: history.canUndo ? '#f8fafc' : '#64748b',
            cursor: history.canUndo ? 'pointer' : 'not-allowed',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <Undo2 size={15} />
          <span>Deshacer</span>
        </button>

        {/* Rehacer (Redo) */}
        <button
          title="Rehacer (Ctrl+Y / Cmd+Shift+Z)"
          disabled={!history.canRedo}
          onClick={() => engine.redo()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: history.canRedo ? '#1e293b' : 'rgba(30, 41, 59, 0.4)',
            color: history.canRedo ? '#f8fafc' : '#64748b',
            cursor: history.canRedo ? 'pointer' : 'not-allowed',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <Redo2 size={15} />
          <span>Rehacer</span>
        </button>
      </div>

      {/* Lado Derecho: BOM, Exportar, Importar, Limpiar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          title="Lista de Materiales y Piezas"
          onClick={onOpenBOM}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #0284c7',
            background: 'rgba(2, 132, 199, 0.18)',
            color: '#38bdf8',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Layers size={15} />
          <span>BOM</span>
        </button>

        <button
          title="Exportar archivo JSON"
          onClick={() => engine.exportJSON()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#cbd5e1',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <Download size={15} />
          <span>Guardar</span>
        </button>

        <button
          title="Importar archivo JSON"
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1e293b',
            color: '#cbd5e1',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <FolderOpen size={15} />
          <span>Abrir</span>
        </button>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />

        <button
          title="Vaciar lienzo"
          onClick={() => engine.clearCanvas()}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            borderRadius: 8,
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#f87171',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </header>
  );
}
