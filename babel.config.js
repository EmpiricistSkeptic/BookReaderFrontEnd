// file: babel.config.js

module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ВАЖНО: Этот плагин должен быть последним в списке
      'react-native-reanimated/plugin',
    ],
  };
};