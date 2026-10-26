import React from 'react';
import { MATERIALS_PALETTE } from '../../utils/brickGeometries.js';

/**
 * Renderizador Isométrico 3D de Micro-piezas con sombreado PBR
 * Provee visualización con volumen y soporte de Drag & Drop HTML5 nativo hacia el Canvas 3D.
 */
export default function BrickThumbnail3D({ pieceType, materialKey, isSelected, onClick, onDragStart }) {
  const matConfig = MATERIALS_PALETTE[materialKey] || MATERIALS_PALETTE.FOX_ORANGE;
  const baseColor = matConfig.color;

  // Tonos isométricos calculados dinámicamente según iluminación direccional
  // Cara superior (luz directa), cara izquierda (semitono), cara derecha (sombra)
  const topFaceStyle = { fill: baseColor, filter: 'brightness(1.15)' };
  const leftFaceStyle = { fill: baseColor, filter: 'brightness(0.92)' };
  const rightFaceStyle = { fill: baseColor, filter: 'brightness(0.72)' };
  const studStyle = { fill: baseColor, filter: 'brightness(1.28)', stroke: 'rgba(255,255,255,0.25)', strokeWidth: '0.8' };

  const handleDragStart = (e) => {
    const data = JSON.stringify({
      t: pieceType,
      m: materialKey,
    });
    e.dataTransfer.setData('application/json', data);
    e.dataTransfer.setData('text/plain', pieceType);
    e.dataTransfer.effectAllowed = 'copy';
    if (onDragStart) onDragStart(pieceType, materialKey);
  };

  const renderIsometricShape = () => {
    switch (pieceType) {
      case 'BRICK_1X1':
        return (
          <g transform="translate(32, 28)">
            {/* Cara Izquierda */}
            <polygon points="0,0 -16,-9 -16,12 0,21" style={leftFaceStyle} />
            {/* Cara Derecha */}
            <polygon points="0,0 16,-9 16,12 0,21" style={rightFaceStyle} />
            {/* Cara Superior */}
            <polygon points="0,0 16,-9 0,-18 -16,-9" style={topFaceStyle} />
            {/* Botón superior (Stud) */}
            <ellipse cx="0" cy="-12" rx="6" ry="3.5" style={studStyle} />
          </g>
        );

      case 'BRICK_1X2':
        return (
          <g transform="translate(32, 30)">
            <polygon points="0,0 -22,-12 -22,9 0,21" style={leftFaceStyle} />
            <polygon points="0,0 12,-7 12,14 0,21" style={rightFaceStyle} />
            <polygon points="0,0 12,-7 -10,-19 -22,-12" style={topFaceStyle} />
            <ellipse cx="-11" cy="-12" rx="5.5" ry="3" style={studStyle} />
            <ellipse cx="0" cy="-6" rx="5.5" ry="3" style={studStyle} />
          </g>
        );

      case 'BRICK_2X1':
        return (
          <g transform="translate(32, 30)">
            <polygon points="0,0 -12,-7 -12,14 0,21" style={leftFaceStyle} />
            <polygon points="0,0 22,-12 22,9 0,21" style={rightFaceStyle} />
            <polygon points="0,0 22,-12 10,-19 -12,-7" style={topFaceStyle} />
            <ellipse cx="0" cy="-6" rx="5.5" ry="3" style={studStyle} />
            <ellipse cx="11" cy="-12" rx="5.5" ry="3" style={studStyle} />
          </g>
        );

      case 'BRICK_2X2':
        return (
          <g transform="translate(32, 31)">
            <polygon points="0,0 -20,-11 -20,8 0,19" style={leftFaceStyle} />
            <polygon points="0,0 20,-11 20,8 0,19" style={rightFaceStyle} />
            <polygon points="0,0 20,-11 0,-22 -20,-11" style={topFaceStyle} />
            {/* 4 Studs */}
            <ellipse cx="-10" cy="-11" rx="4.5" ry="2.6" style={studStyle} />
            <ellipse cx="0" cy="-16" rx="4.5" ry="2.6" style={studStyle} />
            <ellipse cx="0" cy="-6" rx="4.5" ry="2.6" style={studStyle} />
            <ellipse cx="10" cy="-11" rx="4.5" ry="2.6" style={studStyle} />
          </g>
        );

      case 'TILE_1X1':
        return (
          <g transform="translate(32, 30)">
            <polygon points="0,0 -16,-9 -16,10 0,19" style={leftFaceStyle} />
            <polygon points="0,0 16,-9 16,10 0,19" style={rightFaceStyle} />
            <polygon points="0,0 16,-9 0,-18 -16,-9" style={topFaceStyle} />
            {/* Brillo liso superior */}
            <line x1="-10" y1="-9" x2="6" y2="-9" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );

      case 'SLOPE_45':
        return (
          <g transform="translate(32, 30)">
            <polygon points="0,0 -16,-9 -16,12 0,21" style={leftFaceStyle} />
            <polygon points="0,0 16,-4 16,16 0,21" style={rightFaceStyle} />
            {/* Rampa inclinada 45° */}
            <polygon points="0,0 16,-4 0,-16 -16,-9" style={topFaceStyle} />
          </g>
        );

      case 'SLOPE_CURVED':
        return (
          <g transform="translate(32, 30)">
            <polygon points="0,0 -16,-9 -16,12 0,21" style={leftFaceStyle} />
            <path d="M 0,0 Q 10,-3 16,-1 L 16,16 L 0,21 Z" style={rightFaceStyle} />
            <path d="M 0,0 Q 8,-8 0,-17 L -16,-9 Q -8,0 0,0 Z" style={topFaceStyle} />
          </g>
        );

      case 'SLOPE_CORNER':
        return (
          <g transform="translate(32, 30)">
            <polygon points="0,0 -16,-9 -16,12 0,21" style={leftFaceStyle} />
            <polygon points="0,0 16,-9 16,12 0,21" style={rightFaceStyle} />
            <polygon points="0,0 12,-7 0,-16 -12,-7" style={topFaceStyle} />
          </g>
        );

      case 'DOME_1X1':
      default:
        return (
          <g transform="translate(32, 28)">
            <ellipse cx="0" cy="5" rx="15" ry="9" style={rightFaceStyle} />
            <path d="M -15,5 Q 0,-16 15,5 Z" style={topFaceStyle} />
            <circle cx="-3" cy="-4" r="3.5" fill="rgba(255,255,255,0.5)" filter="blur(0.5px)" />
          </g>
        );
    }
  };

  return (
    <div
      draggable="true"
      onDragStart={handleDragStart}
      onClick={onClick}
      style={{
        width: '100%',
        height: 68,
        borderRadius: 10,
        background: isSelected ? 'rgba(234, 88, 12, 0.18)' : '#1e293b',
        border: isSelected ? '2px solid #f97316' : '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        position: 'relative',
        transition: 'all 0.15s ease',
        boxShadow: isSelected ? '0 0 14px rgba(249, 115, 22, 0.35)' : 'none',
      }}
      title="Arrastra y suelta en el lienzo 3D, o haz clic para seleccionarla"
    >
      <svg width="64" height="48" viewBox="0 0 64 48" style={{ overflow: 'visible' }}>
        {renderIsometricShape()}
      </svg>
    </div>
  );
}
