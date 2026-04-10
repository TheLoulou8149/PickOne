const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|react-native-web|@react-native|expo|@expo|' +
  'react-native-reanimated|lucide-react-native|moti|@legendapp|@supabase)/)',
];

// Force zustand to use CJS builds (no import.meta) instead of ESM .mjs builds
const zustandCjsMap = {
  'zustand': path.resolve(__dirname, 'node_modules/zustand/index.js'),
  'zustand/vanilla': path.resolve(__dirname, 'node_modules/zustand/vanilla.js'),
  'zustand/middleware': path.resolve(__dirname, 'node_modules/zustand/middleware.js'),
  'zustand/shallow': path.resolve(__dirname, 'node_modules/zustand/shallow.js'),
  'zustand/react': path.resolve(__dirname, 'node_modules/zustand/react.js'),
  'zustand/traditional': path.resolve(__dirname, 'node_modules/zustand/traditional.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return {
      filePath: require.resolve('tslib/tslib.js'),
      type: 'sourceFile',
    };
  }
  if (zustandCjsMap[moduleName]) {
    return {
      filePath: zustandCjsMap[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
