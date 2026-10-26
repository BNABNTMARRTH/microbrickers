import supercarData from './supercarModel.json';
import mechaData from './mechaModel.json';
import foxData from './foxModel.json';

/**
 * Manifiesto Central de Modelos Predefinidos (Data Manifest)
 *
 * Para anadir un modelo nuevo a la aplicacion:
 * 1. Coloca el archivo <nombre>Model.json en esta carpeta (src/data/presets/).
 * 2. Importalo y anadelo al arreglo PRESETS_MANIFEST.
 *
 * Ningun componente React ni archivo de logica 3D necesita modificarse.
 */
export const PRESETS_MANIFEST = [
  {
    id: 'supercar',
    name: 'Supercar Corsa GT',
    description: 'Deportivo GT con motor biturbo V6, interior en cuero camel y aleron swan-neck.',
    pieces: supercarData,
    isDefault: true,
  },
  {
    id: 'mecha',
    name: 'Mecha Samurai',
    description: 'Guerrero robotico con reactor de plasma interno, blindaje carmesi y catanas de acero.',
    pieces: mechaData,
    isDefault: false,
  },
  {
    id: 'fox',
    name: 'Zorro Rojo',
    description: 'Escultura organica de zorro con base de musgo, cola articulada y pelaje estilizado.',
    pieces: foxData,
    isDefault: false,
  },
];
