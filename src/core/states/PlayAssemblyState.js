import { BaseEditorState } from './BaseEditorState.js';
import { EventBus, EDITOR_EVENTS } from '../events/EventBus.js';

export class PlayAssemblyState extends BaseEditorState {
  constructor(engine) {
    super('play_assembly', 'Modo Desafío de Armado', engine);
    this.score = 0;
  }

  enter() {
    this.engine.setGhostPiece(null);
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: '¡Modo Juego de Armado activo! Sube capas o haz clic en "Armado Cinemático"',
      type: 'info',
    });
  }

  onInstanceClick(event, instanceData) {
    if (!instanceData) return;
    event.stopPropagation();
    // Feedback de inspección de pieza en ensamblado
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: `Pieza correcta de Capa ${instanceData.gz || 0} (${instanceData.g})`,
      type: 'success',
    });
  }
}
