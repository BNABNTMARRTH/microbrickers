import React from 'react';
import { X, Layers, Box } from 'lucide-react';
import { EditorEngine } from '../../core/engine/EditorEngine.js';
import { PIECE_TYPES, MATERIALS_PALETTE } from '../../utils/brickGeometries.js';

export default function BillOfMaterialsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const engine = EditorEngine.getInstance();
  const bom = engine.model.getBillOfMaterials();

  const pieceNames = Object.fromEntries(PIECE_TYPES.map((p) => [p.id, p.label]));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '85vh',
          background: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(30, 41, 59, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={20} color="#38bdf8" />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Lista de Materiales y Piezas (BOM)
              </h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, marginTop: 2 }}>
                Inventario total: <b>{bom.totalPieces.toLocaleString()}</b> micro-piezas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: 6,
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Desglose por Formas */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fdba74', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Desglose por Formas Geométricas
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
              {Object.entries(bom.byType).map(([typeId, qty]) => (
                <div
                  key={typeId}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
                    {pieceNames[typeId] || typeId}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.15)',
                      padding: '2px 8px',
                      borderRadius: 12,
                    }}
                  >
                    {qty}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desglose por Materiales */}
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Desglose por Colores y Materiales PBR
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
              {Object.entries(bom.byMaterial).map(([matKey, qty]) => {
                const cfg = MATERIALS_PALETTE[matKey] || { name: matKey, color: '#999' };
                return (
                  <div
                    key={matKey}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          background: cfg.color,
                          boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                        }}
                      />
                      <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
                        {cfg.name}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#c084fc',
                        background: 'rgba(192, 132, 252, 0.15)',
                        padding: '2px 8px',
                        borderRadius: 12,
                      }}
                    >
                      {qty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer del Modal */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(148, 163, 184, 0.15)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(30, 41, 59, 0.3)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#3b82f6',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
