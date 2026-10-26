import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { EditorEngine } from '../core/engine/EditorEngine.js';
import { EventBus, EDITOR_EVENTS } from '../core/events/EventBus.js';
import { geometryFactory, UX, UY, UZ } from '../core/factories/BrickGeometryFactory.js';
import { materialFactory } from '../core/factories/BrickMaterialFactory.js';
import { AddPieceCommand } from '../core/commands/BrickCommands.js';
import { SUBASSEMBLY_GROUPS } from '../utils/brickGeometries.js';

const dummy = new THREE.Object3D();

export default function MicroBrickScene() {
  const engine = EditorEngine.getInstance();
  const { camera, gl, scene } = useThree();

  const [pieces, setPieces] = useState(() => engine.model.getAllPieces());
  const [maxLayer, setMaxLayer] = useState(() => engine.maxLayer);
  const [activeGroup, setActiveGroup] = useState(() => engine.activeGroup);
  const [explosion, setExplosionState] = useState(() => engine.explosion);
  const [ghost, setGhost] = useState(() => engine.ghostPiece);
  const [activeMode, setActiveMode] = useState(() => engine.getMode());
  const [selectedPieceData, setSelectedPieceData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const animDirRef = useRef(1);
  const instancedRefs = useRef({});
  const controlsRef = useRef();
  const floorMeshRef = useRef();

  // Geometrías y Materiales centralizados por Factoría y Flyweight
  const geometries = useMemo(() => geometryFactory.getAllGeometries(), []);
  const materials = useMemo(() => materialFactory.getAllMaterials(), []);

  // Suscripción al Observer (EventBus)
  useEffect(() => {
    const unsubPieces = EventBus.on(EDITOR_EVENTS.PIECES_UPDATED, (data) => {
      setPieces([...data.pieces]);
      if (engine.selectedPieceIndex !== null) {
        const sel = engine.model.getPiece(engine.selectedPieceIndex);
        setSelectedPieceData(sel ? { ...sel, index: engine.selectedPieceIndex } : null);
      } else {
        setSelectedPieceData(null);
      }
    });

    const unsubLayer = EventBus.on(EDITOR_EVENTS.LAYER_CHANGED, (data) => {
      setMaxLayer(data.maxLayer);
    });

    const unsubGroup = EventBus.on(EDITOR_EVENTS.ACTIVE_GROUP_CHANGED, (data) => {
      setActiveGroup(data.activeGroup);
    });

    const unsubExp = EventBus.on(EDITOR_EVENTS.EXPLOSION_CHANGED, (data) => {
      setExplosionState(data.explosion);
    });

    const unsubState = EventBus.on(EDITOR_EVENTS.STATE_CHANGED, (data) => {
      setActiveMode(data.stateId);
      setGhost(engine.ghostPiece);
    });

    const unsubTool = EventBus.on(EDITOR_EVENTS.TOOL_CONFIG_CHANGED, () => {
      setGhost(engine.ghostPiece ? { ...engine.ghostPiece } : null);
    });

    const unsubSelect = EventBus.on(EDITOR_EVENTS.PIECE_SELECTED, (data) => {
      setSelectedPieceData({ ...data.piece, index: data.index });
    });

    const unsubDeselect = EventBus.on(EDITOR_EVENTS.PIECE_DESELECTED, () => {
      setSelectedPieceData(null);
    });

    const unsubTransform = EventBus.on(EDITOR_EVENTS.PIECE_TRANSFORMED, () => {
      if (engine.selectedPieceIndex !== null) {
        const sel = engine.model.getPiece(engine.selectedPieceIndex);
        setSelectedPieceData(sel ? { ...sel, index: engine.selectedPieceIndex } : null);
      }
    });

    const unsubCamera = EventBus.on(EDITOR_EVENTS.CAMERA_VIEW_TRIGGER, (cam) => {
      if (!controlsRef.current) return;
      const controls = controlsRef.current;
      if (cam.position) controls.object.position.set(...cam.position);
      if (cam.target) controls.target.set(...cam.target);
      controls.update();
    });

    const unsubDrag = EventBus.on(EDITOR_EVENTS.DRAG_STATE_CHANGED, (data) => {
      setIsDragging(Boolean(data.isDragging));
    });

    return () => {
      unsubPieces();
      unsubLayer();
      unsubGroup();
      unsubExp();
      unsubState();
      unsubTool();
      unsubSelect();
      unsubDeselect();
      unsubTransform();
      unsubCamera();
      unsubDrag();
    };
  }, [engine]);

  // Soporte de HTML5 Drag & Drop desde el catálogo hacia el Canvas 3D
  useEffect(() => {
    const canvasEl = gl.domElement;
    if (!canvasEl) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

      const rect = canvasEl.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Raycast sobre el plano del suelo
      if (floorMeshRef.current) {
        const hits = raycaster.intersectObject(floorMeshRef.current);
        if (hits.length > 0) {
          const pt = hits[0].point;
          const gx = Math.round(pt.x / UX);
          const gy = Math.round(pt.z / UY);
          engine.setGhostPiece({
            t: engine.toolConfig.pieceType,
            m: engine.toolConfig.material,
            p: [gx, gy, 0],
            r: engine.toolConfig.rotation,
          });
          setGhost({ ...engine.ghostPiece });
        }
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      try {
        const raw = e.dataTransfer.getData('application/json');
        let pieceInfo = raw ? JSON.parse(raw) : null;
        if (!pieceInfo) {
          const pieceType = e.dataTransfer.getData('text/plain') || engine.toolConfig.pieceType;
          pieceInfo = { t: pieceType, m: engine.toolConfig.material };
        }

        const rect = canvasEl.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        if (floorMeshRef.current) {
          const hits = raycaster.intersectObject(floorMeshRef.current);
          if (hits.length > 0) {
            const pt = hits[0].point;
            const gx = Math.round(pt.x / UX);
            const gy = Math.round(pt.z / UY);

            const newPiece = {
              t: pieceInfo.t || engine.toolConfig.pieceType,
              m: pieceInfo.m || engine.toolConfig.material,
              g: 'CUSTOM',
              p: [gx, gy, 0],
              r: engine.toolConfig.rotation,
            };

            engine.commandManager.execute(new AddPieceCommand(newPiece, engine));
            engine.setGhostPiece(null);
            setGhost(null);

            EventBus.emit(EDITOR_EVENTS.TOAST_NOTIFY, {
              message: `Pieza colocada mediante Drag & Drop en [${gx}, ${gy}, 0]`,
              type: 'success',
            });
          }
        }
      } catch (err) {
        console.error('Error al soltar pieza en 3D:', err);
      }
    };

    canvasEl.addEventListener('dragover', handleDragOver);
    canvasEl.addEventListener('drop', handleDrop);

    return () => {
      canvasEl.removeEventListener('dragover', handleDragOver);
      canvasEl.removeEventListener('drop', handleDrop);
    };
  }, [camera, gl, engine]);

  // Agrupamiento por InstancedMesh (malla + material)
  const batches = useMemo(() => {
    const map = new Map();

    pieces.forEach((p, idx) => {
      if (p.p[2] > maxLayer) return;
      if (activeGroup !== 'ALL' && p.g !== activeGroup) return;

      const key = `${p.t}__${p.m}`;
      if (!map.has(key)) {
        map.set(key, {
          meshType: p.t,
          matKey: p.m,
          items: [],
        });
      }

      const [gx, gy, gz] = p.p;
      const basePos = [gx * UX, gz * UZ, gy * UY];
      const grpInfo = SUBASSEMBLY_GROUPS[p.g] || SUBASSEMBLY_GROUPS.ALL;
      const gVec = grpInfo.vec;
      const gCenter = grpInfo.center;

      const dx = basePos[0] - gCenter[0];
      const dz = basePos[2] - gCenter[2];
      const radLen = Math.hypot(dx, dz);
      const normX = radLen > 0.001 ? (dx / radLen) * (0.18 + 0.55 * radLen) : 0;
      const normZ = radLen > 0.001 ? (dz / radLen) * (0.18 + 0.55 * radLen) : 0;
      const layerY = (basePos[1] - gCenter[1]) * 0.72;

      const finishBoost = (p.t.startsWith('SLOPE') || p.t === 'TILE_1X1' || p.t === 'DOME_1X1') ? 1.32 : 1.0;
      const earSide = p.g === 'EARS' ? (gx > 0 ? 0.28 : -0.28) : 0;

      const stage1 = [
        basePos[0] + gVec[0] * 0.75,
        basePos[1] + gVec[1] * 0.75,
        basePos[2] + gVec[2] * 0.75,
      ];
      const stage2 = [
        basePos[0] + gVec[0] * 1.10 + (normX + earSide) * finishBoost,
        basePos[1] + gVec[1] * 1.10 + layerY,
        basePos[2] + gVec[2] * 1.10 + normZ * finishBoost,
      ];

      map.get(key).items.push({
        originalIndex: idx,
        gx, gy, gz,
        t: p.t,
        m: p.m,
        g: p.g || 'CUSTOM',
        p: p.p,
        r: p.r || 0,
        basePos,
        stage1,
        stage2,
        rotY: -(p.r || 0) * (Math.PI * 0.5),
      });
    });

    return Array.from(map.values());
  }, [pieces, maxLayer, activeGroup]);

  // Render loop a 60 FPS con Patrón Strategy
  useFrame((_, delta) => {
    let currentExp = engine.explosion;
    if (engine.isPlayingExplosion) {
      currentExp += delta * 0.28 * animDirRef.current;
      if (currentExp >= 1.0) {
        currentExp = 1.0;
        animDirRef.current = -1;
      } else if (currentExp <= 0.0) {
        currentExp = 0.0;
        animDirRef.current = 1;
      }
      engine.setExplosion(currentExp);
    }

    const strategy = engine.explosionStrategy;

    for (const batch of batches) {
      const key = `${batch.meshType}__${batch.matKey}`;
      const mesh = instancedRefs.current[key];
      if (!mesh) continue;

      const items = batch.items;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const [x, y, z] = strategy.calculatePosition(it, currentExp);
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, it.rotY, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  // Manejo de eventos delegados a la Máquina de Estados (State Pattern)
  const handleInstancePointerClick = (e, batch) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId === undefined) return;
    const item = batch.items[instanceId];
    if (!item) return;

    engine.stateManager.handleInstanceClick(e, item);
  };

  const handleInstancePointerMove = (e, batch) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId === undefined) return;
    const item = batch.items[instanceId];
    if (!item) return;

    engine.stateManager.handleInstancePointerMove(e, item);
    if (engine.ghostPiece) {
      setGhost({ ...engine.ghostPiece });
    }
  };

  const handleFloorPointerClick = (e) => {
    engine.stateManager.handleFloorClick(e);
  };

  const handlePointerMove = (e) => {
    engine.stateManager.handlePointerMove(e);
    if (engine.ghostPiece) {
      setGhost({ ...engine.ghostPiece });
    }
  };

  const handlePointerUp = (e) => {
    engine.stateManager.handlePointerUp(e);
  };

  return (
    <>
      <color attach="background" args={['#080b11']} />
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[-6, 9, -6]}
        intensity={2.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[6, 5, 5]} intensity={1.1} color="#cce4ff" />
      <directionalLight position={[0, 6, 7]} intensity={1.4} color="#ffdfb8" />

      <Environment preset="city" />

      <group position={[0, -0.4, 0]}>
        {/* Lotes Instanciados de Micro-bloques */}
        {batches.map((batch) => {
          const key = `${batch.meshType}__${batch.matKey}`;
          return (
            <instancedMesh
              key={`${key}_${batch.items.length}`}
              ref={(el) => {
                if (el) {
                  instancedRefs.current[key] = el;
                  // Asignación garantizada de volumen para que Three.js no descarte rayos
                  el.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 0), 25);
                  el.boundingBox = new THREE.Box3(new THREE.Vector3(-10, -5, -10), new THREE.Vector3(10, 15, 10));
                }
              }}
              args={[
                geometries[batch.meshType] || geometries.BRICK_1X1,
                materials[batch.matKey] || materials.FOX_ORANGE,
                batch.items.length
              ]}
              castShadow
              receiveShadow
              onClick={(e) => handleInstancePointerClick(e, batch)}
              onPointerMove={(e) => handleInstancePointerMove(e, batch)}
              onPointerUp={handlePointerUp}
            />
          );
        })}

        {/* Caja de Selección 3D para la pieza armada seleccionada */}
        {selectedPieceData && (
          <group
            position={[
              selectedPieceData.p[0] * UX,
              selectedPieceData.p[2] * UZ,
              selectedPieceData.p[1] * UY,
            ]}
            rotation={[0, -(selectedPieceData.r || 0) * (Math.PI * 0.5), 0]}
          >
            {/* Marco de alambre brillante exterior */}
            <mesh>
              <boxGeometry args={[UX * 1.08, UZ * 1.15, UY * 1.08]} />
              <meshBasicMaterial
                color="#f97316"
                wireframe
                transparent
                opacity={0.88}
              />
            </mesh>
            {/* Halo semitransparente */}
            <mesh>
              <boxGeometry args={[UX * 1.04, UZ * 1.08, UY * 1.04]} />
              <meshBasicMaterial
                color="#f97316"
                transparent
                opacity={0.20}
              />
            </mesh>
          </group>
        )}

        {/* Pieza fantasma en modo Construir o durante Arrastre */}
        {(activeMode === 'build' || activeMode === 'select') && ghost && (
          <mesh
            geometry={geometries[ghost.t] || geometries.BRICK_1X1}
            position={[ghost.p[0] * UX, ghost.p[2] * UZ, ghost.p[1] * UY]}
            rotation={[0, -(ghost.r || 0) * (Math.PI * 0.5), 0]}
          >
            <meshStandardMaterial
              color={materials[ghost.m]?.color || '#ffffff'}
              transparent
              opacity={0.65}
              emissive="#f97316"
              emissiveIntensity={0.3}
            />
          </mesh>
        )}

        {/* Plano de suelo interactivo para colocación */}
        <mesh
          ref={floorMeshRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.002, 0]}
          onPointerMove={handlePointerMove}
          onClick={handleFloorPointerClick}
          onPointerUp={handlePointerUp}
          receiveShadow
        >
          <planeGeometry args={[14, 14]} />
          <meshStandardMaterial color="#0e131f" roughness={0.7} metalness={0.15} />
        </mesh>

        <Grid
          position={[0, 0.001, 0]}
          args={[14, 14]}
          cellSize={UX}
          cellThickness={0.5}
          cellColor="#1e293b"
          sectionSize={UX * 5}
          sectionThickness={1}
          sectionColor="#3b82f6"
          fadeDistance={12}
          fadeStrength={1}
        />

        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.55}
          scale={11}
          blur={2.0}
          far={4.5}
        />
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0.9, 0]}
        minDistance={1.4}
        maxDistance={14}
        enableDamping
        dampingFactor={0.06}
        enabled={!isDragging}
      />
    </>
  );
}
