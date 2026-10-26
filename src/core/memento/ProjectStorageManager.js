import { EventBus, EDITOR_EVENTS } from '../events/EventBus.js';

const STORAGE_KEY = 'microbricks_studio_autosave_v2';

/**
 * Patrón Memento GoF
 * Encapsula una captura inmutable del estado del modelo sin exponer su implementación.
 */
export class ModelSnapshot {
  constructor(pieces, metadata = {}) {
    this.pieces = JSON.parse(JSON.stringify(pieces));
    this.metadata = {
      version: 'v2',
      timestamp: Date.now(),
      pieceCount: pieces.length,
      ...metadata,
    };
  }
}

/**
 * Gestor de Almacenamiento y Mementos (ProjectStorageManager)
 */
export class ProjectStorageManager {
  constructor(engine) {
    this.engine = engine;
    this.debounceTimeout = null;
  }

  /**
   * Crea un memento del estado actual del modelo.
   */
  createSnapshot(name = 'Checkpoint') {
    return new ModelSnapshot(this.engine.model.getAllPieces(), { name });
  }

  /**
   * Restaura el modelo a partir de un memento previo.
   */
  restoreSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.pieces)) {
      console.warn('Snapshot inválido para restaurar');
      return;
    }
    this.engine.model.setPieces(snapshot.pieces, snapshot.metadata?.name);
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: `Restaurado: ${snapshot.metadata?.name || 'Checkpoint'}`,
      type: 'success',
    });
  }

  /**
   * Auto-guardado en segundo plano con debounce
   */
  scheduleAutoSave() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(() => {
      this.saveToLocalStorage();
    }, 1500);
  }

  saveToLocalStorage() {
    try {
      const snapshot = this.createSnapshot('Autosave');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('No se pudo auto-guardar en localStorage:', e);
    }
  }

  loadFromLocalStorage() {
    try {
      // Purgar versión previa v1 obsoleta si existiera
      if (localStorage.getItem('microbricks_studio_autosave_v1')) {
        localStorage.removeItem('microbricks_studio_autosave_v1');
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.metadata?.version !== 'v2') {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      console.error('Error al leer de localStorage:', e);
      return null;
    }
  }

  clearLocalStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('microbricks_studio_autosave_v1');
    } catch (e) {
      console.warn('Error al limpiar localStorage:', e);
    }
  }

  exportToJSON(filename = 'mi_figura_microbricks.json') {
    const pieces = this.engine.model.getAllPieces();
    const dataStr = JSON.stringify(pieces, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: `Exportado archivo ${filename}`,
      type: 'success',
    });
  }

  importFromJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const pieces = JSON.parse(e.target.result);
          if (Array.isArray(pieces)) {
            this.engine.model.setPieces(pieces, file.name);
            this.engine.commandManager.clear();
            EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
              message: `Cargadas ${pieces.length.toLocaleString()} piezas de ${file.name}`,
              type: 'success',
            });
            resolve(pieces);
          } else {
            throw new Error('Formato JSON no es un arreglo de micro-piezas');
          }
        } catch (err) {
          EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
            message: `Error al importar: ${err.message}`,
            type: 'error',
          });
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }
}
