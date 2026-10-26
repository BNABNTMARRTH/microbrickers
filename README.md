# MicroBricks 3D Studio

Plataforma interactiva de armado virtual con micro-piezas 3D de alta densidad, desmontaje en explosion cinematica y arquitectura desacoplada basada en Patrones de Diseno GoF (Three.js, React Three Fiber y Vite).

## Caracteristicas Principales

- **Modelos de Alta Densidad**:
  - Supercar Corsa GT (2,588 micro-piezas) con motor biturbo V6, difusor, interior y aleron swan-neck.
  - Zorro Rojo (1,357 micro-piezas) con base de musgo, cola articulada y pelaje anatomico.
- **Patrones de Diseno GoF Implementados**:
  - **Singleton**: `EditorEngine` como orquestador central con Inversion de Control.
  - **State Pattern**: Transicion fluida entre modos de interaccion (`SelectAndTransformState`, `BuildState`, `PaintState`, `EraseState`, `InspectState`, `PlayAssemblyState`).
  - **Command Pattern**: Pila de ejecucion reversible `Undo` / `Redo` con historico de 100 comandos.
  - **Strategy Pattern**: `VoxelSanitizerStrategy` para garantizar el invariante de colisiones volumétricas cero y eliminacion matematica de Z-Fighting. Estrategias de explosion intercambiables (`RadialExplosionStrategy`, `SubassemblyExplosionStrategy`, `LayerExplosionStrategy`).
  - **Observer Pattern**: `EventBus` desacoplado para coordinar estado 3D con la interfaz de usuario.
  - **Memento Pattern**: `ProjectStorageManager` para persistencia y auto-guardado en localStorage.
- **Materiales PBR**: Pintura automotriz clearcoat, cristales ahumados, opticas LED emisivas, fibra de carbono, caucho y metales pulidos.
- **Controles de Edicion**: Manipulacion de piezas con cursor y teclado (X, Altura y Profundidad Z con tecla Shift).

## Instalacion y Ejecucion Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para produccion
npm run build
```

## Estructura del Repositorio

- `src/core/` - Arquitectura GoF (motor, estados, comandos, estrategias, memento y eventos).
- `src/components/` - Escena 3D WebGL (Three.js/R3F) y componentes de interfaz desacoplados.
- `src/utils/` - Geometrias procedurales de micro-piezas y paleta de materiales PBR.
- `src/data/` - Modelos y datasets volumétricos sanitizados.
- `blender/` - Scripts en Python (`bpy`) para generacion procedural y animacion en Blender.
