import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import MicroBrickScene from './components/MicroBrickScene.jsx';
import EditorHeader from './components/editor/EditorHeader.jsx';
import EditorToolbar from './components/editor/EditorToolbar.jsx';
import AssemblyGuidePanel from './components/editor/AssemblyGuidePanel.jsx';
import PiecePalette from './components/editor/PiecePalette.jsx';
import ViewportOverlay from './components/editor/ViewportOverlay.jsx';
import BillOfMaterialsModal from './components/editor/BillOfMaterialsModal.jsx';
import ToastContainer from './components/editor/ToastContainer.jsx';
import PieceActionToolbar from './components/editor/PieceActionToolbar.jsx';
import { EditorEngine } from './core/engine/EditorEngine.js';
import supercarData from './data/presets/supercarModel.json';

export default function App() {
  const [isBomOpen, setIsBomOpen] = useState(false);

  // Inicialización del Singleton del motor de dominio
  useEffect(() => {
    const engine = EditorEngine.getInstance(supercarData);
    engine.model.name = 'Supercar Corsa GT';
    // Intenta restaurar auto-guardado previo v2 si existe
    const saved = engine.storageManager.loadFromLocalStorage();
    if (saved && Array.isArray(saved.pieces) && saved.pieces.length > 0) {
      engine.storageManager.restoreSnapshot(saved);
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#080b11' }}>
      {/* Escena 3D WebGL con Three.js / React Three Fiber */}
      <Canvas
        shadows
        camera={{ position: [-3.2, 2.6, -4.4], fov: 42 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <MicroBrickScene />
      </Canvas>

      {/* Capa de Interfaz de Usuario Desacoplada (Inversión de Control) */}
      <EditorHeader onOpenBOM={() => setIsBomOpen(true)} />
      <EditorToolbar />
      <AssemblyGuidePanel />
      <PiecePalette />
      <PieceActionToolbar />
      <ViewportOverlay />
      <ToastContainer />

      {/* Modal de Lista de Materiales (BOM) */}
      <BillOfMaterialsModal isOpen={isBomOpen} onClose={() => setIsBomOpen(false)} />
    </div>
  );
}
