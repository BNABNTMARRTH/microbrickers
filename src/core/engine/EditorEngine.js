import { EventBus, EDITOR_EVENTS } from '../events/EventBus.js';
import { BrickModel } from '../model/BrickModel.js';
import { CommandManager } from '../commands/CommandManager.js';
import { EditorStateManager } from '../states/EditorStateManager.js';
import { ProjectStorageManager } from '../memento/ProjectStorageManager.js';
import { EXPLOSION_STRATEGIES } from '../strategies/ExplosionStrategies.js';
import {
  ClearPiecesCommand,
  RotatePieceCommand,
  RemovePieceCommand,
  DuplicatePieceCommand,
  PaintPieceCommand,
  MovePieceCommand,
  AddPieceCommand
} from '../commands/BrickCommands.js';
import { PresetRegistry } from '../registry/PresetRegistry.js';

let instance = null;

/**
 * Patrón Singleton GoF - EditorEngine
 * Punto central del sistema con Inversión de Control (Hollywood Principle).
 * Coordina el modelo de datos, la máquina de estados, el gestor de comandos y la persistencia.
 */
export class EditorEngine {
  constructor(initialPieces = []) {
    if (instance) {
      return instance;
    }
    instance = this;

    // 1. Modelo de Dominio
    this.model = new BrickModel(initialPieces);

    // 2. Gestor de Comandos (Undo / Redo)
    this.commandManager = new CommandManager(100);

    // 3. Persistencia y Memento
    this.storageManager = new ProjectStorageManager(this);

    // 4. Configuración de herramientas
    this.toolConfig = {
      pieceType: 'BRICK_1X1',
      material: 'FOX_ORANGE',
      rotation: 0, // 0: 0°, 1: 90°, 2: 180°, 3: 270°
    };

    // 5. Pieza fantasma para previsualización (Ghost)
    this.ghostPiece = null;

    // 5b. Pieza seleccionada activa en la escena
    this.selectedPieceIndex = null;

    // 6. Controles de escena y visualización
    this.maxLayer = 35;
    this.activeGroup = 'ALL';
    this.explosion = 0.0;
    this.isPlayingExplosion = false;
    this.explosionStrategy = EXPLOSION_STRATEGIES.SUBASSEMBLY;

    // 7. Máquina de Estados (State Pattern)
    this.stateManager = new EditorStateManager(this);

    // 8. Auto-guardado en eventos de mutación
    EventBus.on(EDITOR_EVENTS.PIECES_UPDATED, () => {
      this.storageManager.scheduleAutoSave();
    });

    this._setupKeyboardShortcuts();
  }

  // --- API DE SELECCIÓN Y MANIPULACIÓN DIRECTA ---

  selectPiece(index) {
    const piece = this.model.getPiece(index);
    if (!piece) return;
    this.selectedPieceIndex = index;
    EventBus.emit(EDITOR_EVENTS.PIECE_SELECTED, {
      index,
      piece,
    });
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: `Pieza seleccionada: ${piece.t} (${piece.m}) @ [${piece.p.join(', ')}]`,
      type: 'info',
    });
  }

  deselectPiece() {
    if (this.selectedPieceIndex !== null) {
      this.selectedPieceIndex = null;
      EventBus.emit(EDITOR_EVENTS.PIECE_DESELECTED, {});
    }
  }

  getSelectedPiece() {
    if (this.selectedPieceIndex === null) return null;
    return this.model.getPiece(this.selectedPieceIndex);
  }

  rotateSelectedPiece() {
    if (this.selectedPieceIndex === null) return;
    const piece = this.model.getPiece(this.selectedPieceIndex);
    if (!piece) return;
    const oldRot = piece.r || 0;
    const newRot = (oldRot + 1) % 4;
    this.commandManager.execute(new RotatePieceCommand(this.selectedPieceIndex, oldRot, newRot, this));
  }

  deleteSelectedPiece() {
    if (this.selectedPieceIndex === null) return;
    this.commandManager.execute(new RemovePieceCommand(this.selectedPieceIndex, this));
    this.deselectPiece();
  }

  duplicateSelectedPiece() {
    if (this.selectedPieceIndex === null) return;
    this.commandManager.execute(new DuplicatePieceCommand(this.selectedPieceIndex, [1, 0, 0], this));
  }

  paintSelectedPiece(materialKey) {
    if (this.selectedPieceIndex === null) return;
    this.commandManager.execute(new PaintPieceCommand(this.selectedPieceIndex, materialKey, this));
  }

  startDragging() {
    this.setMode('select');
    const state = this.stateManager.states.get('select');
    if (state && typeof state.startDragging === 'function') {
      state.startDragging();
    }
  }

  moveSelectedPieceByNudge(dx, dy, dz) {
    if (this.selectedPieceIndex === null) return;
    const piece = this.model.getPiece(this.selectedPieceIndex);
    if (!piece) return;

    const oldPos = [...piece.p];
    const newPos = [
      oldPos[0] + dx,
      oldPos[1] + dy,
      Math.max(0, oldPos[2] + dz),
    ];

    if (oldPos[0] === newPos[0] && oldPos[1] === newPos[1] && oldPos[2] === newPos[2]) {
      return;
    }

    this.commandManager.execute(
      new MovePieceCommand(this.selectedPieceIndex, oldPos, newPos, this)
    );
  }

  static getInstance(initialPieces = []) {
    if (!instance) {
      instance = new EditorEngine(initialPieces);
    }
    return instance;
  }

  _setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignorar si el usuario está escribiendo en un input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Detectar tecla 'Z' mantenida como modificador de profundidad (cuando no es Ctrl+Z)
      if (!cmdOrCtrl && e.key.toLowerCase() === 'z') {
        this.isZDepthModifier = true;
      }

      // Navegación con Flechas del Teclado para la pieza seleccionada
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (this.selectedPieceIndex !== null) {
          e.preventDefault();
          const isDepthMode = e.shiftKey || Boolean(this.isZDepthModifier);

          if (isDepthMode) {
            // Plano Horizontal en Profundidad (Eje Z Three.js / gy en cuadrícula)
            if (e.key === 'ArrowUp') this.moveSelectedPieceByNudge(0, -1, 0); // Atrás / Fondo
            if (e.key === 'ArrowDown') this.moveSelectedPieceByNudge(0, 1, 0); // Adelante / Frente
            if (e.key === 'ArrowLeft') this.moveSelectedPieceByNudge(-1, 0, 0);
            if (e.key === 'ArrowRight') this.moveSelectedPieceByNudge(1, 0, 0);
          } else {
            // Plano Vertical Estándar (Eje X y Altura Y Three.js / gz en cuadrícula)
            if (e.key === 'ArrowUp') this.moveSelectedPieceByNudge(0, 0, 1); // Subir en altura
            if (e.key === 'ArrowDown') this.moveSelectedPieceByNudge(0, 0, -1); // Bajar en altura
            if (e.key === 'ArrowLeft') this.moveSelectedPieceByNudge(-1, 0, 0); // Izquierda
            if (e.key === 'ArrowRight') this.moveSelectedPieceByNudge(1, 0, 0); // Derecha
          }
          return;
        }
      }

      // Undo: Cmd+Z o Ctrl+Z
      if (cmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undo();
        return;
      }

      // Redo: Cmd+Shift+Z o Ctrl+Y
      if ((cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') || (cmdOrCtrl && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        this.redo();
        return;
      }

      // Rotación de pieza: Tecla 'R'
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (this.selectedPieceIndex !== null) {
          this.rotateSelectedPiece();
        } else {
          this.rotateTool();
        }
        return;
      }

      // Duplicar pieza: Tecla 'D'
      if (e.key.toLowerCase() === 'd' && this.selectedPieceIndex !== null) {
        e.preventDefault();
        this.duplicateSelectedPiece();
        return;
      }

      // Eliminar pieza: Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedPieceIndex !== null) {
        e.preventDefault();
        this.deleteSelectedPiece();
        return;
      }

      // Deseleccionar: Escape
      if (e.key === 'Escape') {
        this.deselectPiece();
        return;
      }

      // Atajos de modos rápidos:
      if (e.key === '1') this.setMode('select');
      if (e.key === '2') this.setMode('build');
      if (e.key === '3') this.setMode('paint');
      if (e.key === '4') this.setMode('erase');
      if (e.key === '5') this.setMode('inspect');
      if (e.key === '6') this.setMode('play_assembly');
    });

    window.addEventListener('keyup', (e) => {
      if (e.key.toLowerCase() === 'z') {
        this.isZDepthModifier = false;
      }
    });
  }

  // --- API DE CONTROL DE MODOS Y HERRAMIENTAS ---

  setMode(modeId) {
    this.stateManager.setState(modeId);
  }

  getMode() {
    return this.stateManager.getCurrentStateId();
  }

  setPieceType(type) {
    this.toolConfig.pieceType = type;
    this.updateGhost();
    EventBus.emit(EDITOR_EVENTS.TOOL_CONFIG_CHANGED, { ...this.toolConfig });
  }

  setMaterial(materialKey) {
    this.toolConfig.material = materialKey;
    this.updateGhost();
    EventBus.emit(EDITOR_EVENTS.TOOL_CONFIG_CHANGED, { ...this.toolConfig });
  }

  rotateTool() {
    this.toolConfig.rotation = (this.toolConfig.rotation + 1) % 4;
    this.updateGhost();
    EventBus.emit(EDITOR_EVENTS.TOOL_CONFIG_CHANGED, { ...this.toolConfig });
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: `Rotación: ${this.toolConfig.rotation * 90}°`,
      type: 'info',
    });
  }

  setGhostPiece(ghost) {
    this.ghostPiece = ghost;
  }

  updateGhost() {
    if (this.ghostPiece) {
      this.ghostPiece.t = this.toolConfig.pieceType;
      this.ghostPiece.m = this.toolConfig.material;
      this.ghostPiece.r = this.toolConfig.rotation;
    }
  }

  // --- API DE COMANDOS (UNDO / REDO) ---

  undo() {
    this.commandManager.undo();
  }

  redo() {
    this.commandManager.redo();
  }

  clearCanvas() {
    this.commandManager.execute(new ClearPiecesCommand(this));
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: 'Lienzo vaciado. Puedes presionar Deshacer si fue un error.',
      type: 'info',
    });
  }

  // --- API DE ESCENA, CAPAS Y ANIMACIÓN ---

  setMaxLayer(layer) {
    this.maxLayer = layer;
    EventBus.emit(EDITOR_EVENTS.LAYER_CHANGED, { maxLayer: layer });
  }

  setActiveGroup(group) {
    this.activeGroup = group;
    EventBus.emit(EDITOR_EVENTS.ACTIVE_GROUP_CHANGED, { activeGroup: group });
  }

  setExplosion(val) {
    this.explosion = Math.max(0.0, Math.min(1.0, val));
    EventBus.emit(EDITOR_EVENTS.EXPLOSION_CHANGED, {
      explosion: this.explosion,
      isPlaying: this.isPlayingExplosion,
    });
  }

  togglePlayExplosion() {
    this.isPlayingExplosion = !this.isPlayingExplosion;
    EventBus.emit(EDITOR_EVENTS.EXPLOSION_CHANGED, {
      explosion: this.explosion,
      isPlaying: this.isPlayingExplosion,
    });
  }

  setExplosionStrategy(strategyKey) {
    if (EXPLOSION_STRATEGIES[strategyKey]) {
      this.explosionStrategy = EXPLOSION_STRATEGIES[strategyKey];
      EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
        message: `Estrategia de animación: ${this.explosionStrategy.name}`,
        type: 'info',
      });
    }
  }

  // --- CARGA DE PRESETS Y PROYECTOS ---

  loadPreset(pieces, name = 'Preset') {
    this.model.setPieces(pieces, name);
    this.commandManager.clear();
    this.setExplosion(0.0);
    this.setMaxLayer(35);
    this.setActiveGroup('ALL');
    EventBus.emit(EDITOR_EVENTS.MODEL_LOADED, { name, count: pieces.length });
    EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
      message: `Cargado modelo "${name}" (${pieces.length.toLocaleString()} piezas)`,
      type: 'success',
    });
  }

  loadPresetById(presetId) {
    const preset = PresetRegistry.getById(presetId);
    if (preset) {
      this.loadPreset(preset.pieces, preset.name);
      return true;
    }
    return false;
  }

  loadDefaultPreset() {
    const preset = PresetRegistry.getDefault();
    if (preset) {
      this.loadPreset(preset.pieces, preset.name);
      return true;
    }
    return false;
  }

  exportJSON() {
    this.storageManager.exportToJSON(`${this.model.name.replace(/\s+/g, '_').toLowerCase()}.json`);
  }

  importJSON(file) {
    return this.storageManager.importFromJSONFile(file);
  }
}
