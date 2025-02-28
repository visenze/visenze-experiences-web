require('dotenv').config();

const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const { DefinePlugin, IgnorePlugin, optimize } = require('webpack');
const { env } = require('process');
const getWebpackModule = require('./webpack.util');
const getS3Plugin = require('./webpack.s3');

const getWebpackConfig = () => {
  const dir = env.widget_dir;
  const version = require('./src/version');
  const packageName = dir.split('/').pop().replaceAll('-', '_');
  const buildEnv = env.build || 'production';
  const isPublish = env.publish === 'true';

  const exportConfig = {
    entry: {
      [version]: path.resolve(`src/${dir}`, 'index.tsx'),
    },
    output: {
      path: path.resolve(__dirname, `dist/${packageName}`),
      filename: `${buildEnv}.wigmix_${packageName.toLowerCase()}.[name].js`,
      publicPath: '/',
    },
    mode: 'production',
    module: getWebpackModule(packageName, version),
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
