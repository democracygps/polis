const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.common.js');

module.exports = (env, argv) => {
  const modeConfig = require(`./webpack.${argv.mode}.js`);
  return merge(commonConfig, modeConfig(env, argv));
};
