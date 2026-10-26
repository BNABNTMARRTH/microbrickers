/**
 * Patrón Strategy GoF - VoxelSanitizerStrategy
 * Garantiza el invariante de dominio en BrickModel:
 * Ninguna micro-pieza puede compartir coordenadas espaciales [gx, gy, gz] con otra.
 * Elimina automáticamente el Z-Fighting (caras coplanares en el Z-Buffer de la GPU).
 */
export class VoxelSanitizerStrategy {
  /**
   * Sanitiza un arreglo de piezas eliminando cualquier colisión volumétrica.
   * @param {Array<Object>} pieces
   * @returns {Array<Object>} Arreglo limpio sin solapamientos
   */
  sanitize(pieces) {
    if (!Array.isArray(pieces) || pieces.length === 0) return [];

    const occupied = new Map();
    const cleanPieces = [];
    let conflictsRemoved = 0;

    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      if (!piece || !Array.isArray(piece.p) || piece.p.length < 3) continue;

      const [gx, gy, gz] = piece.p;
      let w = 1;
      let d = 1;

      if (piece.t === 'BRICK_2X2') {
        w = 2;
        d = 2;
      } else if (piece.t === 'BRICK_1X2') {
        w = 1;
        d = 2;
      } else if (piece.t === 'BRICK_2X1') {
        w = 2;
        d = 1;
      }

      let hasCollision = false;
      const pieceCells = [];

      // Calcular todas las celdas de la rejilla que ocupa la pieza
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < d; dy++) {
          const key = `${gx + dx},${gy + dy},${gz}`;
          if (occupied.has(key)) {
            hasCollision = true;
            break;
          }
          pieceCells.push(key);
        }
        if (hasCollision) break;
      }

      if (hasCollision) {
        conflictsRemoved++;
        continue;
      }

      // Reclamar las celdas
      for (const cellKey of pieceCells) {
        occupied.set(cellKey, cleanPieces.length);
      }

      cleanPieces.push({ ...piece });
    }

    if (conflictsRemoved > 0) {
      console.warn(`[VoxelSanitizerStrategy] Se eliminaron ${conflictsRemoved} piezas solapadas (Z-Fighting neutralizado).`);
    }

    return cleanPieces;
  }
}

// Instancia compartida (Flyweight / Singleton de la estrategia)
export const defaultVoxelSanitizer = new VoxelSanitizerStrategy();
