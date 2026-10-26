import * as THREE from 'three';
import { BaseEditorState } from './BaseEditorState.js';
import { EventBus, EDITOR_EVENTS } from '../events/EventBus.js';
import {
  MovePieceCommand,
  RotatePieceCommand,
  DuplicatePieceCommand,
  RemovePieceCommand
} from '../commands/BrickCommands.js';
import { UX, UY, UZ } from '../../utils/brickGeometries.js';

export class SelectAndTransformState extends BaseEditorState {
  constructor(engine) {
    super('select', 'Seleccionar y Mover', engine);
    this.isDragging = false;
    this.initialDragPos = null;
    this.currentDragPos = null;
  }

  enter() {
    this.engine.setGhostPiece(null);
  }

  exit() {
    if (this.isDragging) {
      this.isDragging = false;
      this.initialDragPos = null;
      this.currentDragPos = null;
      EventBus.emit(EDITOR_EVENTS.DRAG_STATE_CHANGED, { isDragging: false });
    }
    this.engine.deselectPiece();
  }

  onInstanceClick(event, instanceData) {
    if (!instanceData) return;
    event.stopPropagation();

    // Si estaba en modo arrastre, soltar la pieza en la posición calculada
    if (this.isDragging) {
      this.onPointerUp(event);
      return;
    }

    const clickedIndex = instanceData.originalIndex;
    this.engine.selectPiece(clickedIndex);
  }

  startDragging() {
    if (this.engine.selectedPieceIndex === null) return;
    const piece = this.engine.model.getPiece(this.engine.selectedPieceIndex);
    if (!piece) return;
    this.isDragging = true;
    this.initialDragPos = [...piece.p];
    this.currentDragPos = [...piece.p];
    this.engine.setGhostPiece({
      t: piece.t,
      m: piece.m,
      p: this.currentDragPos,
      r: piece.r || 0,
    });
    EventBus.emit(EDITOR_EVENTS.DRAG_STATE_CHANGED, { isDragging: true });
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: 'Modo arrastre activo. Mueve el ratón y haz clic para soltar la pieza (Esc para cancelar).',
      type: 'info',
    });
  }

  onPointerMove(event) {
    if (!this.isDragging || this.engine.selectedPieceIndex === null) return;

    if (event.point) {
      const gx = Math.round(event.point.x / UX);
      const gy = Math.round(event.point.z / UY);
      const piece = this.engine.model.getPiece(this.engine.selectedPieceIndex);
      if (!piece) return;

      this.currentDragPos = [gx, gy, 0];
      this.engine.setGhostPiece({
        t: piece.t,
        m: piece.m,
        p: this.currentDragPos,
        r: piece.r || 0,
      });
    }
  }

  onInstancePointerMove(event, instanceData) {
    if (!this.isDragging || this.engine.selectedPieceIndex === null) return;
    event.stopPropagation();

    const n = event.face?.normal || new THREE.Vector3(0, 1, 0);
    const nx = Math.round(n.x);
    const ny = Math.round(n.y);
    const nz = Math.round(n.z);

    const piece = this.engine.model.getPiece(this.engine.selectedPieceIndex);
    if (!piece) return;

    this.currentDragPos = [
      instanceData.gx + nx,
      instanceData.gy + nz,
      Math.max(0, instanceData.gz + ny)
    ];

    this.engine.setGhostPiece({
      t: piece.t,
      m: piece.m,
      p: this.currentDragPos,
      r: piece.r || 0,
    });
  }

  onPointerUp(event) {
    if (this.isDragging && this.engine.selectedPieceIndex !== null && this.currentDragPos && this.initialDragPos) {
      const [ix, iy, iz] = this.initialDragPos;
      const [nx, ny, nz] = this.currentDragPos;

      // Si cambió de posición, ejecutamos el comando reversible
      if (ix !== nx || iy !== ny || iz !== nz) {
        this.engine.commandManager.execute(
          new MovePieceCommand(
            this.engine.selectedPieceIndex,
            this.initialDragPos,
            this.currentDragPos,
            this.engine
          )
        );
        EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
          message: `Pieza movida a [${nx}, ${ny}, ${nz}]`,
          type: 'success',
        });
      }

      this.isDragging = false;
      this.initialDragPos = null;
      this.currentDragPos = null;
      this.engine.setGhostPiece(null);
      EventBus.emit(EDITOR_EVENTS.DRAG_STATE_CHANGED, { isDragging: false });
    }
  }

  onFloorClick(event) {
    // Si se hace clic en el piso mientras arrastra, soltar la pieza allí
    if (this.isDragging) {
      this.onPointerUp(event);
      return;
    }
    this.engine.deselectPiece();
  }

  onKeyDown(event) {
    // Si presiona Escape durante arrastre, cancelar arrastre
    if (event.key === 'Escape' && this.isDragging) {
      this.isDragging = false;
      this.initialDragPos = null;
      this.currentDragPos = null;
      this.engine.setGhostPiece(null);
      EventBus.emit(EDITOR_EVENTS.DRAG_STATE_CHANGED, { isDragging: false });
      EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
        message: 'Arrastre cancelado',
        type: 'info',
      });
      return;
    }

    const selIdx = this.engine.selectedPieceIndex;
    if (selIdx === null) return;

    const piece = this.engine.model.getPiece(selIdx);
    if (!piece) return;

    // Rotar pieza con tecla 'R'
    if (event.key.toLowerCase() === 'r') {
      const oldRot = piece.r || 0;
      const newRot = (oldRot + 1) % 4;
      this.engine.commandManager.execute(
        new RotatePieceCommand(selIdx, oldRot, newRot, this.engine)
      );
      EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
        message: `Rotación: ${newRot * 90}°`,
        type: 'info',
      });
    }

    // Duplicar pieza con tecla 'D'
    if (event.key.toLowerCase() === 'd') {
      this.engine.commandManager.execute(
        new DuplicatePieceCommand(selIdx, [1, 0, 0], this.engine)
      );
      EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
        message: 'Pieza duplicada al lado',
        type: 'success',
      });
    }

    // Eliminar pieza con tecla Delete / Backspace
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.engine.commandManager.execute(
        new RemovePieceCommand(selIdx, this.engine)
      );
      this.engine.deselectPiece();
      EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
        message: 'Pieza eliminada',
        type: 'info',
      });
    }

    // Deseleccionar con Escape
    if (event.key === 'Escape') {
      this.engine.deselectPiece();
    }
  }
}
