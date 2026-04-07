// Inline Babel plugin: replaces `import.meta` with `{}` so Metro web
// doesn't crash on react-native-worklets / reanimated which use ESM syntax.
const transformImportMeta = ({ types: t }) => ({
  visitor: {
    MetaProperty(path) {
      if (
        path.node.meta.name === 'import' &&
        path.node.property.name === 'meta'
      ) {
        path.replaceWith(t.objectExpression([]));
      }
    },
  },
});

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      transformImportMeta,
      'react-native-reanimated/plugin',
    ],
  };
};
