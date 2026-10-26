import { BaseEditorState } from './BaseEditorState.js';
import { RemovePieceCommand } from '../commands/BrickCommands.js';

export class EraseState extends BaseEditorState {
  constructor(engine) {
    super('erase', 'Herramienta Borrar', engine);
  }

  enter() {
    this.engine.setGhostPiece(null);
  }

  onInstanceClick(event, instanceData) {
    if (!instanceData) return;
    event.stopPropagation();
    this.engine.commandManager.execute(
      new RemovePieceCommand(instanceData.originalIndex, this.engine)
    );
  }
}
