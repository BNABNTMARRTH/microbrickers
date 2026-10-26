import { BaseEditorState } from './BaseEditorState.js';
import { PaintPieceCommand } from '../commands/BrickCommands.js';

export class PaintState extends BaseEditorState {
  constructor(engine) {
    super('paint', 'Herramienta Pintar', engine);
  }

  enter() {
    this.engine.setGhostPiece(null);
  }

  onInstanceClick(event, instanceData) {
    if (!instanceData) return;
    event.stopPropagation();
    const targetMat = this.engine.toolConfig.material;
    const currentMat = instanceData.m;

    if (targetMat === currentMat) return;

    this.engine.commandManager.execute(
      new PaintPieceCommand(instanceData.originalIndex, targetMat, this.engine)
    );
  }
}
