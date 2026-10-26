/**
 * Clase base abstracta para el Patrón Command GoF.
 * Todo comando reversible en MicroBricks debe heredar de esta clase.
 */
export class Command {
  constructor(name = 'Comando Sin Nombre') {
    this.name = name;
    this.timestamp = Date.now();
  }

  /**
   * Ejecuta la mutación sobre el modelo.
   * Debe lanzar error si no se implementa en la subclase.
   */
  execute() {
    throw new Error(`execute() no implementado en comando "${this.name}"`);
  }

  /**
   * Revierte la mutación efectuada, restaurando el estado previo exacto.
   * Debe lanzar error si no se implementa en la subclase.
   */
  undo() {
    throw new Error(`undo() no implementado en comando "${this.name}"`);
  }
}
