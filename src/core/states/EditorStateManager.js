import { EventBus, EDITOR_EVENTS } from '../events/EventBus.js';
import { InspectState } from './InspectState.js';
import { BuildState } from './BuildState.js';
import { PaintState } from './PaintState.js';
import { EraseState } from './EraseState.js';
import { PlayAssemblyState } from './PlayAssemblyState.js';
import { SelectAndTransformState } from './SelectAndTransformState.js';

/**
 * Gestor de la Máquina de Estados Finitos (GoF State Context)
 * Orquesta las transiciones entre modos de juego y editor.
 */
export class EditorStateManager {
  constructor(engine) {
    this.engine = engine;
    this.states = new Map();
    this.currentState = null;

    this._registerDefaultStates();
  }

  _registerDefaultStates() {
    this.registerState(new SelectAndTransformState(this.engine));
    this.registerState(new InspectState(this.engine));
    this.registerState(new BuildState(this.engine));
    this.registerState(new PaintState(this.engine));
    this.registerState(new EraseState(this.engine));
    this.registerState(new PlayAssemblyState(this.engine));

    // Estado inicial: Selección y manipulación directa
    this.setState('select');
  }

  registerState(state) {
    this.states.set(state.id, state);
  }

  setState(stateId) {
    if (!this.states.has(stateId)) {
      console.warn(`Estado "${stateId}" no existe en el gestor.`);
      return;
    }

    if (this.currentState) {
      this.currentState.exit();
    }

    this.currentState = this.states.get(stateId);
    this.currentState.enter();

    EventBus.emit(EDITOR_EVENTS.STATE_CHANGED, {
      stateId,
      label: this.currentState.label,
    });
  }

  getCurrentStateId() {
    return this.currentState ? this.currentState.id : 'inspect';
  }

  handlePointerMove(event) {
    if (this.currentState) {
      this.currentState.onPointerMove(event);
    }
  }

  handleInstancePointerMove(event, instanceData) {
    if (this.currentState && typeof this.currentState.onInstancePointerMove === 'function') {
      this.currentState.onInstancePointerMove(event, instanceData);
    }
  }

  handlePointerUp(event) {
    if (this.currentState && typeof this.currentState.onPointerUp === 'function') {
      this.currentState.onPointerUp(event);
    }
  }

  handleInstanceClick(event, instanceData) {
    if (this.currentState) {
      this.currentState.onInstanceClick(event, instanceData);
    }
  }

  handleFloorClick(event) {
    if (this.currentState) {
      this.currentState.onFloorClick(event);
    }
  }

  handleKeyDown(event) {
    if (this.currentState) {
      this.currentState.onKeyDown(event);
    }
  }
}
