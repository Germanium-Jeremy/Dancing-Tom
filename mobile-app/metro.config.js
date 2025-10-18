const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add FBX and other 3D model formats as asset extensions
config.resolver.assetExts.push(
  'fbx',
  'glb',
  'gltf',
  'bin',
  'obj',
  'mtl',
  'dae'
);

module.exports = config;
