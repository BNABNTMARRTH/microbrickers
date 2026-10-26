/**
 * Patrón Observer (Pub-Sub) GoF
 * Desacopla el motor 3D de la interfaz gráfica y de los comandos de dominio.
 */
class EventBusClass {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Suscribe un callback a un evento específico.
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a ejecutar
   * @returns {Function} Función para cancelar la suscripción
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Desuscribe un callback de un evento.
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emite un evento a todos los observadores registrados.
   * @param {string} event - Nombre del evento
   * @param {*} data - Carga útil del evento
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error en observador de EventBus para "${event}":`, err);
        }
      }
    }
  }

  /**
   * Limpia todos los suscriptores.
   */
  clear() {
    this.listeners.clear();
  }
}

// Exportamos instancia compartida (Singleton del bus de eventos)
export const EventBus = new EventBusClass();

// Catálogo de eventos del sistema
export const EDITOR_EVENTS = {
  PIECES_UPDATED: 'PIECES_UPDATED',
  PIECE_ADDED: 'PIECE_ADDED',
  PIECE_REMOVED: 'PIECE_REMOVED',
  PIECE_PAINTED: 'PIECE_PAINTED',
  STATE_CHANGED: 'STATE_CHANGED',
  HISTORY_CHANGED: 'HISTORY_CHANGED',
  LAYER_CHANGED: 'LAYER_CHANGED',
  EXPLOSION_CHANGED: 'EXPLOSION_CHANGED',
  ACTIVE_GROUP_CHANGED: 'ACTIVE_GROUP_CHANGED',
  TOOL_CONFIG_CHANGED: 'TOOL_CONFIG_CHANGED',
  MODEL_LOADED: 'MODEL_LOADED',
  CAMERA_VIEW_TRIGGER: 'CAMERA_VIEW_TRIGGER',
  TOAST_NOTIFY: 'TOAST_NOTIFY',
  PIECE_SELECTED: 'PIECE_SELECTED',
  PIECE_DESELECTED: 'PIECE_DESELECTED',
  PIECE_TRANSFORMED: 'PIECE_TRANSFORMED',
  DRAG_STATE_CHANGED: 'DRAG_STATE_CHANGED',
};
