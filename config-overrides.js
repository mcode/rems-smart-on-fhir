module.exports = function override(config, _env) {
  console.log('override');
  let loaders = config.resolve;
  loaders.fallback = {
    fs: false,
    timers: require.resolve('timers-browserify')
  };

  return config;
};
