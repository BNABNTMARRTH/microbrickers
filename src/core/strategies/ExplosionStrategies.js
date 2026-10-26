import { UX, UY, UZ, SUBASSEMBLY_GROUPS } from '../../utils/brickGeometries.js';

/**
 * Patrón Strategy GoF
 * Encapsula algoritmos intercambiables para el desensamble y la animación de piezas.
 */
export class BaseExplosionStrategy {
  constructor(name) {
    this.name = name;
  }

  /**
   * Calcula la posición animada de una pieza según el progreso t (0..1)
   * @param {Object} item - Datos precalculados de la pieza
   * @param {number} t - Factor de explosión (0.0 a 1.0)
   * @returns {[number, number, number]} Coordenadas [x, y, z] en Three.js
   */
  calculatePosition(item, t) {
    throw new Error('calculatePosition() no implementado en estrategia concreta');
  }
}

/**
 * Estrategia 1: Desensamble Anatómico por Sub-ensambles (Fase 1: Grupos -> Fase 2: Capas Radiales)
 */
export class SubassemblyStrategy extends BaseExplosionStrategy {
  constructor() {
    super('Desensamble Anatómico por Sub-ensambles');
  }

  calculatePosition(item, t) {
    if (t <= 0.0001) {
      return item.basePos;
    }

    const t1 = Math.min(1.0, t / 0.45);
    const smooth1 = t1 * t1 * (3 - 2 * t1);

    if (t <= 0.45) {
      return [
        item.basePos[0] + (item.stage1[0] - item.basePos[0]) * smooth1,
        item.basePos[1] + (item.stage1[1] - item.basePos[1]) * smooth1,
        item.basePos[2] + (item.stage1[2] - item.basePos[2]) * smooth1,
      ];
    }

    const t2 = Math.max(0.0, (t - 0.45) / 0.55);
    const smooth2 = t2 * t2 * (3 - 2 * t2);

    return [
      item.stage1[0] + (item.stage2[0] - item.stage1[0]) * smooth2,
      item.stage1[1] + (item.stage2[1] - item.stage1[1]) * smooth2,
      item.stage1[2] + (item.stage2[2] - item.stage1[2]) * smooth2,
    ];
  }
}

/**
 * Estrategia 2: Dispersión Radial Pura (Spherical / Cylindrical Scatter)
 */
export class RadialLayerStrategy extends BaseExplosionStrategy {
  constructor() {
    super('Dispersión Radial Cilíndrica');
  }

  calculatePosition(item, t) {
    if (t <= 0.0001) return item.basePos;
    const smooth = t * t * (3 - 2 * t);
    const [bx, by, bz] = item.basePos;

    const rad = Math.hypot(bx, bz) + 0.1;
    const angle = Math.atan2(bz, bx);
    const dist = smooth * 1.8;

    return [
      bx + Math.cos(angle) * dist,
      by + (by * 0.4 + 0.2) * smooth,
      bz + Math.sin(angle) * dist,
    ];
  }
}

/**
 * Estrategia 3: Cascada de Montaje Cinemático por Capas (Instructivo animado)
 */
export class SequentialAssemblyStrategy extends BaseExplosionStrategy {
  constructor() {
    super('Montaje Cinemático por Capas');
  }

  calculatePosition(item, t) {
    // gz representa la capa de altura (0 a 35)
    const layer = item.gz || 0;
    const layerProgress = Math.min(1.0, Math.max(0.0, t * 38 - layer));
    if (layerProgress >= 1.0) {
      return item.basePos;
    }
    const smooth = (1.0 - layerProgress);
    return [
      item.basePos[0],
      item.basePos[1] + smooth * 2.5, // Cae desde arriba hacia la posición exacta
      item.basePos[2],
    ];
  }
}

export const EXPLOSION_STRATEGIES = {
  SUBASSEMBLY: new SubassemblyStrategy(),
  RADIAL: new RadialLayerStrategy(),
  SEQUENTIAL: new SequentialAssemblyStrategy(),
};
