const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Metro to run Babel on these packages (they use import.meta / ESM syntax)
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|react-native-web|@react-native|expo|@expo|' +
  'react-native-reanimated|react-native-worklets-core|react-native-worklets|' +
  'lucide-react-native|moti|@legendapp)/)',
];

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return {
      filePath: require.resolve('tslib/tslib.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
