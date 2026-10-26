import * as THREE from 'three';
import { BaseEditorState } from './BaseEditorState.js';
import { AddPieceCommand } from '../commands/BrickCommands.js';
import { UX, UY, UZ } from '../../utils/brickGeometries.js';

export class BuildState extends BaseEditorState {
  constructor(engine) {
    super('build', 'Modo Construcción', engine);
  }

  enter() {
    this.engine.updateGhost();
  }

  exit() {
    this.engine.setGhostPiece(null);
  }

  onPointerMove(event) {
    if (event.point) {
      const gx = Math.round(event.point.x / UX);
      const gy = Math.round(event.point.z / UY);
      this.engine.setGhostPiece({
        t: this.engine.toolConfig.pieceType,
        m: this.engine.toolConfig.material,
        p: [gx, gy, 0],
        r: this.engine.toolConfig.rotation,
      });
    }
  }

  onInstancePointerMove(event, instanceData) {
    if (!instanceData) return;
    event.stopPropagation();
    const n = event.face?.normal || new THREE.Vector3(0, 1, 0);
    const nx = Math.round(n.x);
    const ny = Math.round(n.y); // Altura Three.js -> gz
    const nz = Math.round(n.z); // Profundidad Three.js -> gy

    this.engine.setGhostPiece({
      t: this.engine.toolConfig.pieceType,
      m: this.engine.toolConfig.material,
      p: [
        instanceData.gx + nx,
        instanceData.gy + nz,
        Math.max(0, instanceData.gz + ny)
      ],
      r: this.engine.toolConfig.rotation,
    });
  }

  onFloorClick(event) {
    if (!event.point) return;
    event.stopPropagation();
    const gx = Math.round(event.point.x / UX);
    const gy = Math.round(event.point.z / UY);

    const newPiece = {
      t: this.engine.toolConfig.pieceType,
      m: this.engine.toolConfig.material,
      g: 'CUSTOM',
      p: [gx, gy, 0],
      r: this.engine.toolConfig.rotation,
    };

    this.engine.commandManager.execute(new AddPieceCommand(newPiece, this.engine));
  }

  onInstanceClick(event, instanceData) {
    if (!instanceData) return;
    event.stopPropagation();

    // Normal de contacto para apilar en altura o adosar en laterales
    const n = event.face?.normal || new THREE.Vector3(0, 1, 0);
    const nx = Math.round(n.x);
    const ny = Math.round(n.y); // Altura -> gz
    const nz = Math.round(n.z); // Profundidad -> gy

    const newPiece = {
      t: this.engine.toolConfig.pieceType,
      m: this.engine.toolConfig.material,
      g: 'CUSTOM',
      p: [
        instanceData.gx + nx,
        instanceData.gy + nz,
        Math.max(0, instanceData.gz + ny)
      ],
      r: this.engine.toolConfig.rotation,
    };

    this.engine.commandManager.execute(new AddPieceCommand(newPiece, this.engine));
  }
}
