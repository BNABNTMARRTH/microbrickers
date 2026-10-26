import { Command } from './Command.js';
import { EventBus, EDITOR_EVENTS } from '../events/EventBus.js';

/**
 * Comando para añadir una micro-pieza a la escena.
 */
export class AddPieceCommand extends Command {
  constructor(piece, engine) {
    super(`Colocar ${piece.t}`);
    this.piece = { ...piece };
    this.engine = engine;
    this.addedIndex = -1;
  }

  execute() {
    this.addedIndex = this.engine.model.addPiece(this.piece);
    EventBus.emit(EDITOR_EVENTS.PIECE_ADDED, {
      piece: this.piece,
      index: this.addedIndex,
    });
  }

  undo() {
    if (this.addedIndex >= 0) {
      this.engine.model.removePiece(this.addedIndex);
      EventBus.emit(EDITOR_EVENTS.PIECE_REMOVED, {
        index: this.addedIndex,
      });
      this.addedIndex = -1;
    }
  }
}

/**
 * Comando para eliminar una micro-pieza de la escena.
 */
export class RemovePieceCommand extends Command {
  constructor(index, engine) {
    super('Eliminar pieza');
    this.index = index;
    this.engine = engine;
    this.removedPiece = null;
  }

  execute() {
    this.removedPiece = this.engine.model.getPiece(this.index);
    if (!this.removedPiece) return;
    this.engine.model.removePiece(this.index);
    EventBus.emit(EDITOR_EVENTS.PIECE_REMOVED, {
      piece: this.removedPiece,
      index: this.index,
    });
  }

  undo() {
    if (this.removedPiece) {
      this.engine.model.insertPieceAt(this.index, this.removedPiece);
      EventBus.emit(EDITOR_EVENTS.PIECE_ADDED, {
        piece: this.removedPiece,
        index: this.index,
      });
    }
  }
}

/**
 * Comando para cambiar el material/color de una micro-pieza existente.
 */
export class PaintPieceCommand extends Command {
  constructor(index, newMaterial, engine) {
    super(`Pintar pieza`);
    this.index = index;
    this.newMaterial = newMaterial;
    this.oldMaterial = null;
    this.engine = engine;
  }

  execute() {
    const piece = this.engine.model.getPiece(this.index);
    if (!piece) return;
    this.oldMaterial = piece.m;
    this.engine.model.updatePieceMaterial(this.index, this.newMaterial);
    EventBus.emit(EDITOR_EVENTS.PIECE_PAINTED, {
      index: this.index,
      newMaterial: this.newMaterial,
      oldMaterial: this.oldMaterial,
    });
  }

  undo() {
    if (this.oldMaterial !== null) {
      this.engine.model.updatePieceMaterial(this.index, this.oldMaterial);
      EventBus.emit(EDITOR_EVENTS.PIECE_PAINTED, {
        index: this.index,
        newMaterial: this.oldMaterial,
        oldMaterial: this.newMaterial,
      });
    }
  }
}

/**
 * Comando para limpiar todo el lienzo con posibilidad de restauración completa.
 */
export class ClearPiecesCommand extends Command {
  constructor(engine) {
    super('Limpiar lienzo');
    this.engine = engine;
    this.backupPieces = [];
  }

  execute() {
    this.backupPieces = [...this.engine.model.getAllPieces()];
    this.engine.model.setPieces([]);
    EventBus.emit(EDITOR_EVENTS.PIECES_UPDATED, {
      pieces: [],
      reason: 'clear',
    });
  }

  undo() {
    this.engine.model.setPieces(this.backupPieces);
    EventBus.emit(EDITOR_EVENTS.PIECES_UPDATED, {
      pieces: this.backupPieces,
      reason: 'undo_clear',
    });
  }
}

/**
 * Comando compuesto (GoF Composite Command) para operaciones en lote.
 */
export class BatchCommand extends Command {
  constructor(commands = [], name = 'Operación en lote') {
    super(name);
    this.commands = commands;
  }

  execute() {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo() {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

/**
 * Comando para mover una micro-pieza existente a nuevas coordenadas en la rejilla.
 */
export class MovePieceCommand extends Command {
  constructor(index, oldPos, newPos, engine) {
    super('Mover pieza');
    this.index = index;
    this.oldPos = [...oldPos];
    this.newPos = [...newPos];
    this.engine = engine;
  }

  execute() {
    this.engine.model.updatePiecePosition(this.index, this.newPos);
    EventBus.emit(EDITOR_EVENTS.PIECE_TRANSFORMED, {
      index: this.index,
      pos: this.newPos,
    });
  }

  undo() {
    this.engine.model.updatePiecePosition(this.index, this.oldPos);
    EventBus.emit(EDITOR_EVENTS.PIECE_TRANSFORMED, {
      index: this.index,
      pos: this.oldPos,
    });
  }
}

/**
 * Comando para rotar 90° una micro-pieza existente.
 */
export class RotatePieceCommand extends Command {
  constructor(index, oldRot, newRot, engine) {
    super('Rotar pieza');
    this.index = index;
    this.oldRot = oldRot;
    this.newRot = newRot;
    this.engine = engine;
  }

  execute() {
    this.engine.model.updatePieceRotation(this.index, this.newRot);
    EventBus.emit(EDITOR_EVENTS.PIECE_TRANSFORMED, {
      index: this.index,
      rotation: this.newRot,
    });
  }

  undo() {
    this.engine.model.updatePieceRotation(this.index, this.oldRot);
    EventBus.emit(EDITOR_EVENTS.PIECE_TRANSFORMED, {
      index: this.index,
      rotation: this.oldRot,
    });
  }
}

/**
 * Comando para duplicar una micro-pieza existente.
 */
export class DuplicatePieceCommand extends Command {
  constructor(sourceIndex, offset = [1, 0, 0], engine) {
    super('Duplicar pieza');
    this.sourceIndex = sourceIndex;
    this.offset = offset;
    this.engine = engine;
    this.createdIndex = -1;
  }

  execute() {
    const src = this.engine.model.getPiece(this.sourceIndex);
    if (!src) return;
    const clone = {
      ...src,
      p: [src.p[0] + this.offset[0], src.p[1] + this.offset[1], src.p[2] + this.offset[2]],
    };
    this.createdIndex = this.engine.model.addPiece(clone);
    EventBus.emit(EDITOR_EVENTS.PIECE_ADDED, {
      piece: clone,
      index: this.createdIndex,
    });
  }

  undo() {
    if (this.createdIndex >= 0) {
      this.engine.model.removePiece(this.createdIndex);
      EventBus.emit(EDITOR_EVENTS.PIECE_REMOVED, {
        index: this.createdIndex,
      });
      this.createdIndex = -1;
    }
  }
}

