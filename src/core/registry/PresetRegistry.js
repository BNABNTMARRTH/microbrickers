import { PRESETS_MANIFEST } from '../../data/presets/manifest.js';

/**
 * Patron Registry GoF - PresetRegistry
 *
 * Implementa el Principio Abierto/Cerrado (OCP):
 * La aplicacion esta abierta a incorporar infinitos modelos nuevos mediante el manifiesto,
 * pero cerrada a modificaciones en sus componentes centrales (EditorHeader, App, etc.).
 */
class PresetRegistryService {
  constructor() {
    this.presetsMap = new Map();
    this.defaultId = null;

    // Inicializar desde el manifiesto declarativo
    for (const item of PRESETS_MANIFEST) {
      this.register(item);
    }
  }

  /**
   * Registra un modelo en el sistema
   */
  register(item) {
    if (!item || !item.id || !Array.isArray(item.pieces)) {
      console.warn('[PresetRegistry] Intento de registrar modelo invalido:', item);
      return;
    }

    const descriptor = {
      id: item.id,
      name: item.name || item.id,
      description: item.description || '',
      piecesCount: item.pieces.length,
      pieces: item.pieces,
      isDefault: Boolean(item.isDefault),
    };

    this.presetsMap.set(item.id, descriptor);

    if (descriptor.isDefault || !this.defaultId) {
      this.defaultId = item.id;
    }
  }

  /**
   * Obtiene todos los modelos registrados con sus metadatos
   */
  getAll() {
    return Array.from(this.presetsMap.values()).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      piecesCount: p.piecesCount,
      isDefault: p.isDefault,
    }));
  }

  /**
   * Obtiene un modelo completo por su ID
   */
  getById(id) {
    return this.presetsMap.get(id) || null;
  }

  /**
   * Obtiene el modelo predeterminado del sistema
   */
  getDefault() {
    return this.getById(this.defaultId) || this.presetsMap.values().next().value || null;
  }

  /**
   * Comprueba si un modelo existe por su ID
   */
  has(id) {
    return this.presetsMap.has(id);
  }
}

export const PresetRegistry = new PresetRegistryService();
