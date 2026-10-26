/**
 * Patrón State GoF - Clase Base Abstracta
 * Modela el comportamiento e interacciones del editor según el modo activo.
 */
export class BaseEditorState {
  constructor(id, label, engine) {
    this.id = id;
    this.label = label;
    this.engine = engine;
  }

  enter() {}
  exit() {}

  onPointerMove(event) {}
  onInstancePointerMove(event, instanceData) {}
  onInstanceClick(event, instanceData) {}
  onFloorClick(event) {}
  onPointerUp(event) {}
  onKeyDown(event) {}
}
