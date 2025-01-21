require('dotenv').config();

const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const versionRegex = new RegExp(/^(\d)+\.(\d){1,3}\.(\d){1,3}$/);
const { DefinePlugin, IgnorePlugin, optimize } = require('webpack');
const { env } = require('process');
const getWebpackModule = require('./webpack.util');
const getS3Plugin = require('./webpack.s3');

const getWebpackConfig = (config) => {
  let customer = config.custom_build;
  let dir = config.dir;
  let entry = config.entry || 'index.ts';
  let isUseShadowDom = config.use_shadow_dom !== 'false';
  let packageName = config.name.replaceAll('-', '_');
  let version = require(`./src/version`);
  let buildEnv = env.build || 'production';
  let isPublish = env.publish === 'true';
  let prefix = 'wigmix';

  if (!versionRegex.test(version)) {
    throw new Error('Invalid script version');
  }

  const exportConfig = {
    entry: {
      [version]: path.resolve(dir ? `src/${dir}` : 'src', entry),
    },
    output: {
      path: path.resolve(__dirname, `dist/${customer ? customer + '/' : ''}${packageName}`),
      filename: (customer ? `${customer}.` : '') + `${buildEnv}.${prefix}_${packageName.toLowerCase()}.[name].js`,
      publicPath: '/',
    },
    mode: 'production',
    module: getWebpackModule(packageName, version, isUseShadowDom),
    plugins: [
      new DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env.BUILD_ENV': JSON.stringify(buildEnv),
      }),
      new IgnorePlugin({
        resourceRegExp: /\/iconv-loader$/,
      }),
      new optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
      new ESLintPlugin({
        extensions: ['ts', 'tsx', 'js', 'jsxs'],
        emitError: true,
        emitWarning: false,
        failOnError: true,
      }),
      new CompressionPlugin(),
    ],
    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.jsx', '.css', '.scss'],
    },
  };

  if (isPublish) {
    exportConfig.plugins.push(getS3Plugin(buildEnv));
  }

  return exportConfig;
};

module.exports = (config) => {
  return getWebpackConfig(config);
};
