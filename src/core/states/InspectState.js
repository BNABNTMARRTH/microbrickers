import { BaseEditorState } from './BaseEditorState.js';
import { EventBus, EDITOR_EVENTS } from '../events/EventBus.js';

export class InspectState extends BaseEditorState {
  constructor(engine) {
    super('inspect', 'Modo Inspección', engine);
  }

  enter() {
    this.engine.setGhostPiece(null);
  }

  onInstanceClick(event, instanceData) {
    if (!instanceData) return;
    event.stopPropagation();
    // Emite selección para el inspector lateral
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: `Pieza: ${instanceData.t} (${instanceData.m}) @ [${instanceData.p.join(', ')}]`,
      type: 'info',
    });
  }
}
