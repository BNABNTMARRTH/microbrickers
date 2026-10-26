import { EventBus, EDITOR_EVENTS } from '../events/EventBus.js';

/**
 * Gestor de Comandos (GoF Command Invoker)
 * Maneja la ejecución y pilas reversibles de Deshacer (Undo) y Rehacer (Redo).
 */
export class CommandManager {
  constructor(maxHistory = 100) {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = maxHistory;
  }

  /**
   * Ejecuta un comando y lo apila en el historial de deshacer.
   * Limpia la pila de rehacer al crear una nueva ramificación de acciones.
   * @param {import('./Command.js').Command} command
   */
  execute(command) {
    if (!command || typeof command.execute !== 'function') {
      console.error('El objeto pasado no es un comando válido:', command);
      return;
    }

    try {
      command.execute();
      this.undoStack.push(command);
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
      this.redoStack = [];
      this.notifyHistoryChange();
    } catch (err) {
      console.error(`Error al ejecutar el comando "${command.name}":`, err);
    }
  }

  /**
   * Deshace el último comando ejecutado.
   */
  undo() {
    if (!this.canUndo()) return;
    const command = this.undoStack.pop();
    try {
      command.undo();
      this.redoStack.push(command);
      this.notifyHistoryChange();
      EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
        message: `Deshecho: ${command.name}`,
        type: 'info',
      });
    } catch (err) {
      console.error(`Error al deshacer el comando "${command.name}":`, err);
    }
  }

  /**
   * Rehace el último comando deshecho.
   */
  redo() {
    if (!this.canRedo()) return;
    const command = this.redoStack.pop();
    try {
      command.execute();
      this.undoStack.push(command);
      this.notifyHistoryChange();
      EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
        message: `Rehecho: ${command.name}`,
        type: 'info',
      });
    } catch (err) {
      console.error(`Error al rehacer el comando "${command.name}":`, err);
    }
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyHistoryChange();
  }

  notifyHistoryChange() {
    EventBus.emit(EDITOR_EVENTS.HISTORY_CHANGED, {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastCommand: this.undoStack[this.undoStack.length - 1]?.name || null,
    });
  }
}
