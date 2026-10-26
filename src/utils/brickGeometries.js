import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const UX = 0.12;
export const UY = 0.12;
export const UZ = 0.085;
export const GAP = 0.003;

export const MATERIALS_PALETTE = {
  // Materiales Supercar GT
  CAR_RED:          { name: 'Rojo Corsa GT',     color: '#d90b0b', roughness: 0.08, clearcoat: 0.85, metalness: 0.15 },
  CAR_DARK_RED:     { name: 'Rojo Sombra',       color: '#780606', roughness: 0.12, clearcoat: 0.75, metalness: 0.15 },
  CAR_WHITE:        { name: 'Blanco Perla',      color: '#f4f5f7', roughness: 0.10, clearcoat: 0.80, metalness: 0.10 },
  CAR_CARBON:       { name: 'Fibra de Carbono',  color: '#121417', roughness: 0.22, clearcoat: 0.35, metalness: 0.25 },
  CAR_TIRE:         { name: 'Caucho Neumático',  color: '#08080a', roughness: 0.58, clearcoat: 0.00, metalness: 0.00 },
  CAR_GOLD_RIM:     { name: 'Oro Rines GT',      color: '#e0a329', roughness: 0.16, clearcoat: 0.45, metalness: 0.88 },
  CAR_CHROME:       { name: 'Cromo / Aluminio',  color: '#c4cad4', roughness: 0.14, clearcoat: 0.35, metalness: 0.92 },
  CAR_GUNMETAL:     { name: 'Titanio Motor',     color: '#3a404a', roughness: 0.24, clearcoat: 0.25, metalness: 0.82 },
  CAR_GLASS:        { name: 'Cristal Ahumado',   color: '#162838', roughness: 0.03, clearcoat: 0.95, transparent: true, opacity: 0.72 },
  CAR_HEADLIGHT:    { name: 'Faro LED Blanco',   color: '#e0f4ff', roughness: 0.03, clearcoat: 0.90, transparent: true, opacity: 0.92, emissive: '#b8e6ff', emissiveIntensity: 0.9 },
  CAR_TAILLIGHT:    { name: 'Calavera LED Roja', color: '#ff1108', roughness: 0.04, clearcoat: 0.90, transparent: true, opacity: 0.90, emissive: '#ff0800', emissiveIntensity: 1.1 },
  CAR_CALIPER_YLW:  { name: 'Cáliper Amarillo',  color: '#fab805', roughness: 0.12, clearcoat: 0.65, metalness: 0.10 },
  CAR_INTERIOR_TAN: { name: 'Cuero Camel',       color: '#944d1f', roughness: 0.28, clearcoat: 0.15, metalness: 0.02 },
  TRACK_ASPHALT:    { name: 'Asfalto Pista',     color: '#1b1d22', roughness: 0.42, clearcoat: 0.10, metalness: 0.05 },

  // Materiales Zorro Rojo
  FOX_ORANGE:       { name: 'Naranja Zorro',     color: '#dc3808', roughness: 0.16, clearcoat: 0.35 },
  FOX_DARK_ORANGE:  { name: 'Terracota Sombra',  color: '#851a04', roughness: 0.18, clearcoat: 0.30 },
  FOX_GOLD:         { name: 'Ámbar Dorado',      color: '#f5700f', roughness: 0.16, clearcoat: 0.35 },
  FOX_WHITE:        { name: 'Blanco Crema',      color: '#f2ede0', roughness: 0.15, clearcoat: 0.35 },
  FOX_DARK:         { name: 'Carbón Oscuro',     color: '#141214', roughness: 0.20, clearcoat: 0.25 },
  FOX_NOSE:         { name: 'Negro Espejo',      color: '#050505', roughness: 0.04, clearcoat: 0.80 },
  FOX_EYE_AMBER:    { name: 'Cristal Ámbar',     color: '#ff8505', roughness: 0.05, clearcoat: 0.90, transparent: true, opacity: 0.88, emissive: '#ff6a00', emissiveIntensity: 0.35 },
  FOX_EAR_PINK:     { name: 'Rosa Coral',        color: '#c2574d', roughness: 0.22, clearcoat: 0.25 },
  BASE_MOSS:        { name: 'Verde Musgo',       color: '#26611c', roughness: 0.22, clearcoat: 0.25 },
  BASE_DARK_MOSS:   { name: 'Verde Bosque',      color: '#12360f', roughness: 0.24, clearcoat: 0.20 },
  BASE_EARTH:       { name: 'Tierra / Madera',   color: '#381c0d', roughness: 0.28, clearcoat: 0.15 },
  BASE_STONE:       { name: 'Piedra Gris',       color: '#4d545c', roughness: 0.25, clearcoat: 0.20 },
  FLOWER_BLUE:      { name: 'Cristal Azul',      color: '#1f9eff', roughness: 0.05, clearcoat: 0.90, transparent: true, opacity: 0.85, emissive: '#0077ff', emissiveIntensity: 0.40 },
};

export const PIECE_TYPES = [
  { id: 'BRICK_1X1',    label: 'Micro-Bloque 1×1',   desc: 'Bloque estándar con botón superior' },
  { id: 'BRICK_1X2',    label: 'Micro-Placa 1×2',    desc: 'Placa doble para trabado estructural' },
  { id: 'BRICK_2X1',    label: 'Micro-Placa 2×1',    desc: 'Placa doble transversal' },
  { id: 'BRICK_2X2',    label: 'Micro-Bloque 2×2',   desc: 'Bloque estructural de 4 botones' },
  { id: 'SLOPE_45',     label: 'Micro-Rampa 45°',    desc: 'Pendiente inclinada para siluetas realistas' },
  { id: 'SLOPE_CURVED', label: 'Cuña Curva Suave',   desc: 'Rampa aerodinámica sin bordes cuadrados' },
  { id: 'SLOPE_CORNER', label: 'Cuña de Esquina',    desc: 'Transición diagonal en esquinas' },
  { id: 'TILE_1X1',     label: 'Azulejo Liso 1×1',   desc: 'Acabado superior liso sin botón' },
  { id: 'DOME_1X1',     label: 'Micro-Domo / Faro',  desc: 'Pieza esférica para faros, ojos y detalles' },
];

// En Three.js: X es ancho, Y es altura (Z en Blender), Z es profundidad (Y en Blender)
export const SUBASSEMBLY_GROUPS = {
  ALL:        { label: 'Todo el Modelo',         vec: [0, 0, 0],            center: [0, 0.8, 0] },
  // Grupos Supercar GT
  SPOILER:    { label: 'Alerón GT (Swan-Neck)',  vec: [0.0, +1.85, +1.55],  center: [0.0, 14.0 * UZ, 17.5 * UY] },
  ROOF_GLASS: { label: 'Techo y Cristales',      vec: [0.0, +1.55, -0.05],  center: [0.0, 11.5 * UZ, -1.0 * UY] },
  FRONT_HOOD: { label: 'Cofre y Faros LED',      vec: [0.0, +0.75, -1.25],  center: [0.0,  7.5 * UZ, -14.5 * UY] },
  REAR_BODY:  { label: 'Cubierta Trasera y LED', vec: [0.0, +1.15, +1.15],  center: [0.0,  9.5 * UZ,  12.0 * UY] },
  DOORS_L:    { label: 'Puerta y Toma Izq.',     vec: [-1.15, +0.45, -0.10],center: [-7.5 * UX, 7.5 * UZ, -2.0 * UY] },
  DOORS_R:    { label: 'Puerta y Toma Der.',     vec: [+1.15, +0.45, -0.10],center: [+7.5 * UX, 7.5 * UZ, -2.0 * UY] },
  WHEELS_L:   { label: 'Ruedas y Frenos Izq.',   vec: [-1.35, 0.0, 0.0],    center: [-7.5 * UX, 5.2 * UZ, 0.0] },
  WHEELS_R:   { label: 'Ruedas y Frenos Der.',   vec: [+1.35, 0.0, 0.0],    center: [+7.5 * UX, 5.2 * UZ, 0.0] },
  ENGINE:     { label: 'Motor Biturbo V6',       vec: [0.0, +0.55, +0.35],  center: [0.0,  7.5 * UZ,  9.5 * UY] },
  INTERIOR:   { label: 'Cabina Interior',        vec: [0.0, +0.38, -0.10],  center: [0.0,  7.0 * UZ, -3.0 * UY] },
  CHASSIS:    { label: 'Chasis y Difusor',       vec: [0.0, -0.10,  0.00],  center: [0.0,  3.5 * UZ,  0.0] },
  // Grupos Zorro Rojo
  HEAD:       { label: 'Cabeza (Zorro)',         vec: [0.0, +0.85, -0.10],  center: [0.0, 22.8 * UZ, -1.6 * UY] },
  EARS:       { label: 'Orejas (Zorro)',         vec: [0.0, +1.35, +0.05],  center: [0.0, 29.5 * UZ, -0.8 * UY] },
  SNOUT:      { label: 'Hocico (Zorro)',         vec: [0.0, +0.88, -1.10],  center: [0.0, 21.0 * UZ, -7.2 * UY] },
  CHEST:      { label: 'Pecho Blanco (Zorro)',   vec: [0.0, +0.15, -0.90],  center: [0.0, 13.5 * UZ, -3.5 * UY] },
  TORSO:      { label: 'Torso Central (Zorro)',  vec: [0.0, +0.10,  0.00],  center: [0.0, 11.0 * UZ,  0.5 * UY] },
  LEGS_L:     { label: 'Patas Izq. (Zorro)',     vec: [-0.82, -0.04, -0.32],center: [-3.2 * UX, 7.5 * UZ, -1.5 * UY] },
  LEGS_R:     { label: 'Patas Der. (Zorro)',     vec: [+0.82, -0.04, -0.32],center: [+3.2 * UX, 7.5 * UZ, -1.5 * UY] },
  TAIL:       { label: 'Cola (Zorro)',           vec: [+0.35, +0.28, +1.05],center: [1.5 * UX, 10.5 * UZ, 9.0 * UY] },
  BASE:       { label: 'Plataforma Base',        vec: [0.0, -0.45,  0.00],  center: [0.0, 1.0 * UZ,  0.0] },
};

function makeBrickGeometry(nx = 1, ny = 1, hasStuds = true) {
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

function makeSlope45Geometry() {
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

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: hz * 2,
    bevelEnabled: false,
  });
  geom.translate(0, 0, -hz);
  geom.computeVertexNormals();
  return geom;
}

function makeCurvedSlopeGeometry() {
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

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: hz * 2,
    bevelEnabled: false,
  });
  geom.translate(0, 0, -hz);
  geom.computeVertexNormals();
  return geom;
}

function makeCornerSlopeGeometry() {
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

function makeDomeGeometry() {
  const r = (UX - GAP) * 0.48;
  const geom = new THREE.SphereGeometry(r, 16, 10);
  geom.scale(1, 0.72, 1);
  geom.translate(0, UZ * 0.5, 0);
  geom.computeVertexNormals();
  return geom;
}

export function createBrickGeometries() {
  return {
    BRICK_1X1:    makeBrickGeometry(1, 1, true),
    BRICK_1X2:    makeBrickGeometry(1, 2, true),
    BRICK_2X1:    makeBrickGeometry(2, 1, true),
    BRICK_2X2:    makeBrickGeometry(2, 2, true),
    TILE_1X1:     makeBrickGeometry(1, 1, false),
    SLOPE_45:     makeSlope45Geometry(),
    SLOPE_CURVED: makeCurvedSlopeGeometry(),
    SLOPE_CORNER: makeCornerSlopeGeometry(),
    DOME_1X1:     makeDomeGeometry(),
  };
}

export function createBrickMaterials() {
  const mats = {};
  for (const [key, cfg] of Object.entries(MATERIALS_PALETTE)) {
    mats[key] = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(cfg.color),
      roughness: cfg.roughness,
      metalness: cfg.metalness ?? 0.02,
      clearcoat: cfg.clearcoat ?? 0.3,
      clearcoatRoughness: 0.06,
      transparent: Boolean(cfg.transparent),
      opacity: cfg.opacity ?? 1.0,
      emissive: cfg.emissive ? new THREE.Color(cfg.emissive) : new THREE.Color('#000000'),
      emissiveIntensity: cfg.emissiveIntensity ?? 0.0,
    });
  }
  return mats;
}
