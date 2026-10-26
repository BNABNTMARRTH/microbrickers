import React, { useState, useEffect } from 'react';
import { RotateCw, ChevronRight, ChevronLeft, Palette } from 'lucide-react';
import { EditorEngine } from '../../core/engine/EditorEngine.js';
import { EventBus, EDITOR_EVENTS } from '../../core/events/EventBus.js';
import { PIECE_TYPES, MATERIALS_PALETTE } from '../../utils/brickGeometries.js';
import BrickThumbnail3D from './BrickThumbnail3D.jsx';

export default function PiecePalette() {
  const engine = EditorEngine.getInstance();
  const [toolConfig, setToolConfig] = useState(() => ({ ...engine.toolConfig }));
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const unsub = EventBus.on(EDITOR_EVENTS.TOOL_CONFIG_CHANGED, (cfg) => {
      setToolConfig({ ...cfg });
    });
    return unsub;
  }, []);

  return (
    <aside
      style={{
        position: 'absolute',
        top: 80,
        right: 16,
        width: isOpen ? 290 : 44,
        maxHeight: 'calc(100vh - 100px)',
        background: 'rgba(15, 23, 42, 0.90)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(148, 163, 184, 0.20)',
        borderRadius: 14,
        padding: isOpen ? 16 : 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        zIndex: 85,
        boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
        transition: 'width 0.2s ease, padding 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Botón de Colapsar / Expandir */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Palette size={16} color="#f97316" />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Catálogo de Micro-Piezas
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
          {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {isOpen && (
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
          {/* Rotación y Ayuda */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(30, 41, 59, 0.6)',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Rotación: <b style={{ color: '#fdba74' }}>{toolConfig.rotation * 90}°</b> (Tecla <kbd>R</kbd>)
            </div>
            <button
              onClick={() => engine.rotateTool()}
              title="Rotar pieza 90° (Tecla R)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid #f97316',
                background: 'rgba(249, 115, 22, 0.15)',
                color: '#fdba74',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCw size={13} />
              <span>Girar</span>
            </button>
          </div>

          {/* Formas Geométricas 3D */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Piezas 3D (Arrastra o Clic)
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {PIECE_TYPES.map((pt) => {
                const isSel = toolConfig.pieceType === pt.id;
                return (
                  <div key={pt.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <BrickThumbnail3D
                      pieceType={pt.id}
                      materialKey={toolConfig.material}
                      isSelected={isSel}
                      onClick={() => {
                        engine.setPieceType(pt.id);
                        if (engine.getMode() !== 'build') engine.setMode('build');
                      }}
                      onDragStart={(type, mat) => {
                        engine.setPieceType(type);
                        engine.setMaterial(mat);
                      }}
                    />
                    <div
                      style={{
                        fontSize: 9,
                        color: isSel ? '#fdba74' : '#94a3b8',
                        textAlign: 'center',
                        fontWeight: isSel ? 700 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={pt.label}
                    >
                      {pt.label.replace('Micro-', '')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Paleta PBR */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Material ABS y Cristales PBR
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {Object.entries(MATERIALS_PALETTE).map(([key, cfg]) => {
                const isSel = toolConfig.material === key;
                return (
                  <button
                    key={key}
                    title={`${cfg.name} (${cfg.color})`}
                    onClick={() => engine.setMaterial(key)}
                    style={{
                      height: 32,
                      borderRadius: 7,
                      background: cfg.color,
                      border: isSel ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.18)',
                      cursor: 'pointer',
                      boxShadow: isSel ? '0 0 0 2px #f97316, 0 4px 10px rgba(0,0,0,0.5)' : 'none',
                      transform: isSel ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 0.15s ease',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
