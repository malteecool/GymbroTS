// Learn more https://docs.expo.io/guides/customizing-metro
// Imported through `expo/` rather than `@expo/metro-config` directly: the
// latter is a transitive package, so whether it sits at the top of node_modules
// depends on how npm happens to hoist. `expo` is a direct dependency and always
// resolves.
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = defaultConfig;
