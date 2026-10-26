import { EventBus, EDITOR_EVENTS } from '../events/EventBus.js';
import { defaultVoxelSanitizer } from './VoxelSanitizerStrategy.js';

/**
 * Modelo de Dominio de MicroBricks (Dominio encapsulado).
 * Gestiona la colección de micro-piezas de la escena activa.
 * Utiliza el Patrón Strategy (VoxelSanitizerStrategy) para asegurar el invariante:
 * Cero colisiones de celdas y cero Z-Fighting.
 */
export class BrickModel {
  constructor(initialPieces = [], sanitizer = defaultVoxelSanitizer) {
    this.sanitizer = sanitizer;
    this.pieces = this.sanitizer.sanitize(initialPieces);
    this.name = 'Proyecto Sin Título';
  }

  getAllPieces() {
    return this.pieces;
  }

  getCount() {
    return this.pieces.length;
  }

  getPiece(index) {
    return this.pieces[index] ? { ...this.pieces[index] } : null;
  }

  addPiece(piece) {
    const candidate = [...this.pieces, piece];
    const clean = this.sanitizer.sanitize(candidate);
    this.pieces = clean;
    EventBus.emit(EDITOR_EVENTS.PIECES_UPDATED, {
      pieces: this.pieces,
      count: this.pieces.length,
    });
    return this.pieces.length - 1;
  }

  removePiece(index) {
    if (index >= 0 && index < this.pieces.length) {
      const removed = this.pieces.splice(index, 1)[0];
      EventBus.emit(EDITOR_EVENTS.PIECES_UPDATED, {
        pieces: this.pieces,
        count: this.pieces.length,
      });
      return removed;
    }
    return null;
  }

  insertPieceAt(index, piece) {
    if (index >= 0 && index <= this.pieces.length) {
      this.pieces.splice(index, 0, piece);
      EventBus.emit(EDITOR_EVENTS.PIECES_UPDATED, {
        pieces: this.pieces,
        count: this.pieces.length,
      });
    }
  }

  updatePieceMaterial(index, newMaterial) {
    if (this.pieces[index]) {
      this.pieces[index] = { ...this.pieces[index], m: newMaterial };
      EventBus.emit(EDITOR_EVENTS.PIECES_UPDATED, {
        pieces: this.pieces,
        count: this.pieces.length,
      });
    }
  }

  updatePiecePosition(index, newPos) {
    if (this.pieces[index]) {
      this.pieces[index] = { ...this.pieces[index], p: [...newPos] };
      EventBus.emit(EDITOR_EVENTS.PIECES_UPDATED, {
        pieces: this.pieces,
        count: this.pieces.length,
      });
    }
  }

  updatePieceRotation(index, newRot) {
    if (this.pieces[index]) {
      this.pieces[index] = { ...this.pieces[index], r: newRot };
      EventBus.emit(EDITOR_EVENTS.PIECES_UPDATED, {
        pieces: this.pieces,
        count: this.pieces.length,
      });
    }
  }

  duplicatePiece(index, offset = [1, 0, 0]) {
    const src = this.pieces[index];
    if (!src) return -1;
    const clone = {
      ...src,
      p: [src.p[0] + offset[0], src.p[1] + offset[1], src.p[2] + offset[2]],
    };
    return this.addPiece(clone);
  }

  setPieces(newPieces, name = null) {
    this.pieces = this.sanitizer.sanitize(newPieces);
    if (name) this.name = name;
    EventBus.emit(EDITOR_EVENTS.PIECES_UPDATED, {
      pieces: this.pieces,
      count: this.pieces.length,
    });
  }

  /**
   * Genera estadísticas de Lista de Materiales (BOM)
   */
  getBillOfMaterials() {
    const byType = {};
    const byMaterial = {};

    for (const p of this.pieces) {
      byType[p.t] = (byType[p.t] || 0) + 1;
      byMaterial[p.m] = (byMaterial[p.m] || 0) + 1;
    }

    return {
      totalPieces: this.pieces.length,
      byType,
      byMaterial,
    };
  }
}
