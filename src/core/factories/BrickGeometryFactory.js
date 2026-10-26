import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const UX = 0.12;
export const UY = 0.12;
export const UZ = 0.085;
export const GAP = 0.003;

/**
 * Patrón Factory Method + Flyweight GoF
 * Crea, almacena en caché y reutiliza geometrías de micro-piezas sin duplicación de vértices.
 */
export class BrickGeometryFactory {
  constructor() {
    this.cache = new Map();
  }

  getGeometry(type) {
    if (!this.cache.has(type)) {
      const geom = this.createGeometry(type);
      this.cache.set(type, geom);
    }
    return this.cache.get(type);
  }

  getAllGeometries() {
    const types = [
      'BRICK_1X1', 'BRICK_1X2', 'BRICK_2X1', 'BRICK_2X2',
      'TILE_1X1', 'SLOPE_45', 'SLOPE_CURVED', 'SLOPE_CORNER', 'DOME_1X1'
    ];
    const dict = {};
    for (const t of types) {
      dict[t] = this.getGeometry(t);
    }
    return dict;
  }

  createGeometry(type) {
    switch (type) {
      case 'BRICK_1X1': return this._makeBrick(1, 1, true);
      case 'BRICK_1X2': return this._makeBrick(1, 2, true);
      case 'BRICK_2X1': return this._makeBrick(2, 1, true);
      case 'BRICK_2X2': return this._makeBrick(2, 2, true);
      case 'TILE_1X1': return this._makeBrick(1, 1, false);
      case 'SLOPE_45': return this._makeSlope45();
      case 'SLOPE_CURVED': return this._makeCurvedSlope();
      case 'SLOPE_CORNER': return this._makeCornerSlope();
      case 'DOME_1X1': return this._makeDome();
      default:
        console.warn(`Tipo de micro-pieza desconocido "${type}", usando 1x1`);
        return this._makeBrick(1, 1, true);
    }
  }

  _makeBrick(nx = 1, ny = 1, hasStuds = true) {
    const w = nx * UX - GAP;
    const d = ny * UY - GAP;
    const h = UZ - GAP * 0.5;
    const cx = (nx - 1) * UX * 0.5;
    const cz = (ny - 1) * UY * 0.5;

    const parts = [];
    const box = new THREE.BoxGeometry(w, h, d);
    box.translate(cx, h * 0.5, cz);
    parts.push(box);

    if (hasStuds) {
      const studR = 0.035;
      const studH = 0.022;
      for (let ix = 0; ix < nx; ix++) {
        for (let iy = 0; iy < ny; iy++) {
          const cyl = new THREE.CylinderGeometry(studR, studR, studH, 14);
          cyl.translate(ix * UX, h + studH * 0.5, iy * UY);
          parts.push(cyl);
        }
      }
    }
    const merged = mergeGeometries(parts, false);
    merged.computeVertexNormals();
    return merged;
  }

  _makeSlope45() {
    const hx = (UX - GAP) * 0.5;
    const hz = (UY - GAP) * 0.5;
    const yt = UZ - GAP * 0.5;
    const yf = yt * 0.22;
    const xb = -hx + (UX - GAP) * 0.22;

    const shape = new THREE.Shape();
    shape.moveTo(-hx, 0);
    shape.lineTo(+hx, 0);
    shape.lineTo(+hx, yf);
    shape.lineTo(xb, yt);
    shape.lineTo(-hx, yt);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, { depth: hz * 2, bevelEnabled: false });
    geom.translate(0, 0, -hz);
    geom.computeVertexNormals();
    return geom;
  }

  _makeCurvedSlope() {
    const hx = (UX - GAP) * 0.5;
    const hz = (UY - GAP) * 0.5;
    const yt = UZ - GAP * 0.5;

    const shape = new THREE.Shape();
    shape.moveTo(-hx, 0);
    shape.lineTo(+hx, 0);
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = hx - t * (2 * hx);
      const y = yt * (0.15 + 0.85 * Math.sin(t * Math.PI * 0.5));
      shape.lineTo(x, y);
    }
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, { depth: hz * 2, bevelEnabled: false });
    geom.translate(0, 0, -hz);
    geom.computeVertexNormals();
    return geom;
  }

  _makeCornerSlope() {
    const hx = (UX - GAP) * 0.5;
    const hz = (UY - GAP) * 0.5;
    const yt = UZ - GAP * 0.5;
    const yf = yt * 0.22;

    const geom = new THREE.BufferGeometry();
    const v = [
      -hx, 0, -hz,   +hx, 0, -hz,   +hx, 0, +hz,   -hx, 0, +hz,
      -hx, yt, -hz,  +hx, yf, -hz,  +hx, yf, +hz,  -hx, yf, +hz,
    ];
    const indices = [
      0, 1, 2,  0, 2, 3,
      4, 6, 5,  4, 7, 6,
      0, 5, 1,  0, 4, 5,
      1, 6, 2,  1, 5, 6,
      2, 7, 3,  2, 6, 7,
      3, 4, 0,  3, 7, 4,
    ];
    geom.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  _makeDome() {
    const r = (UX - GAP) * 0.48;
    const geom = new THREE.SphereGeometry(r, 16, 10);
    geom.scale(1, 0.72, 1);
    geom.translate(0, UZ * 0.5, 0);
    geom.computeVertexNormals();
    return geom;
  }

  dispose() {
    for (const geom of this.cache.values()) {
      geom.dispose();
    }
    this.cache.clear();
  }
}

export const geometryFactory = new BrickGeometryFactory();
