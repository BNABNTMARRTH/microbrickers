import * as THREE from 'three';
import { MATERIALS_PALETTE } from '../../utils/brickGeometries.js';

/**
 * Patrón Factory Method + Flyweight GoF para Materiales PBR
 * Garantiza reutilización de mallas y texturas sin fugas de memoria en WebGL.
 */
export class BrickMaterialFactory {
  constructor() {
    this.materials = new Map();
    this._initMaterials();
  }

  _initMaterials() {
    for (const [key, cfg] of Object.entries(MATERIALS_PALETTE)) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(cfg.color),
        roughness: cfg.roughness ?? 0.16,
        metalness: 0.02,
        clearcoat: cfg.clearcoat ?? 0.35,
        clearcoatRoughness: 0.08,
        transparent: Boolean(cfg.transparent),
        opacity: cfg.opacity ?? 1.0,
        emissive: cfg.emissive ? new THREE.Color(cfg.emissive) : new THREE.Color('#000000'),
        emissiveIntensity: cfg.emissiveIntensity ?? 0.0,
      });
      this.materials.set(key, mat);
    }
  }

  getMaterial(key) {
    if (!this.materials.has(key)) {
      console.warn(`Material desconocido "${key}", usando FOX_ORANGE`);
      return this.materials.get('FOX_ORANGE');
    }
    return this.materials.get(key);
  }

  getAllMaterials() {
    const obj = {};
    for (const [k, v] of this.materials.entries()) {
      obj[k] = v;
    }
    return obj;
  }

  dispose() {
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
  }
}

export const materialFactory = new BrickMaterialFactory();
