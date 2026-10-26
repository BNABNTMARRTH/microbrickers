import React from 'react';
import { Compass, HelpCircle } from 'lucide-react';
import { EventBus, EDITOR_EVENTS } from '../../core/events/EventBus.js';

export default function ViewportOverlay() {
  const [showHelp, setShowHelp] = React.useState(false);

  const setCameraView = (type) => {
    let position = [-3.2, 2.6, -4.4];
    const target = [0, 0.9, 0];

    if (type === 'ISO') position = [-3.2, 2.6, -4.4];
    else if (type === 'TOP') position = [0.001, 7.0, 0];
    else if (type === 'FRONT') position = [0, 1.1, -6.0];
    else if (type === 'SIDE') position = [-6.0, 1.1, 0];

    EventBus.emit(EDITOR_EVENTS.CAMERA_VIEW_TRIGGER, { position, target });
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: `Cámara: Vista ${type}`,
      type: 'info',
    });
  };

  return (
    <>
      {/* Botones de Cámara Rápida (Abajo a la Izquierda) */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 16,
          zIndex: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: 10,
          padding: '4px 8px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', marginRight: 4 }}>
          <Compass size={15} />
        </span>
        {['ISO', 'TOP', 'FRONT', 'SIDE'].map((view) => (
          <button
            key={view}
            onClick={() => setCameraView(view)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#e2e8f0',
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            {view}
          </button>
        ))}

        <button
          onClick={() => setShowHelp((p) => !p)}
          title="Ver atajos de teclado"
          style={{
            background: showHelp ? '#3b82f6' : '#1e293b',
            border: '1px solid #334155',
            borderRadius: 6,
            color: showHelp ? '#fff' : '#94a3b8',
            padding: '4px 6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            marginLeft: 4,
          }}
        >
          <HelpCircle size={14} />
        </button>
      </div>

      {/* Popover de Ayuda de Teclado */}
      {showHelp && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 16,
            zIndex: 85,
            width: 260,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: 12,
            padding: 14,
            boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
            fontSize: 11,
            color: '#cbd5e1',
          }}
        >
          <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 8, fontSize: 12 }}>
            Atajos de Teclado del Editor
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Herramientas 1-5:</span>
              <b style={{ color: '#fdba74' }}>1, 2, 3, 4, 5</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Mover pieza (X / Altura):</span>
              <b style={{ color: '#fdba74' }}>← → ↑ ↓</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Mover en profundidad (Z):</span>
              <b style={{ color: '#c084fc' }}>Shift + ↑ ↓ (o tecla Z)</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Rotar pieza:</span>
              <b style={{ color: '#fdba74' }}>R</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Duplicar pieza:</span>
              <b style={{ color: '#34d399' }}>D</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Eliminar pieza:</span>
              <b style={{ color: '#f87171' }}>Supr / Backspace</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Deshacer / Rehacer:</span>
              <b style={{ color: '#38bdf8' }}>Ctrl+Z / Ctrl+Y</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Girar cámara 3D:</span>
              <span style={{ color: '#94a3b8' }}>Arrastrar clic izquierdo</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Desplazar cámara:</span>
              <span style={{ color: '#94a3b8' }}>Arrastrar clic derecho</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Zoom:</span>
              <span style={{ color: '#94a3b8' }}>Rueda del ratón</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
