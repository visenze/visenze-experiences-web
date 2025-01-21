const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const { HotModuleReplacementPlugin } = require('webpack');
const { env } = require('process');
const getWebpackModule = require('./webpack.util');

module.exports = (config) => {
	const dir = config.dir;
	const version = require(`./src/version`);
	const packageName = dir.split('/').pop().replaceAll('-', '_');
	const directory = `src/${dir}`;
	return {
		devtool: 'source-map',
		entry: path.resolve(directory, 'index-dev.tsx'),
		output: {
			path: path.resolve(directory, 'dist'),
			filename: 'index_bundle.js',
			publicPath: '/',
		},
		mode: 'development',
		module: getWebpackModule(packageName, version),
		plugins: [
			new HtmlWebpackPlugin({
				template: path.resolve(directory, 'index.html'),
			}),
			new HotModuleReplacementPlugin(),
			new ESLintPlugin({
				extensions: ['ts', 'tsx', 'js', 'jsx'],
				emitError: true,
				emitWarning: false,
				failOnError: true,
			}),
		],
		resolve: {
			extensions: ['.js', '.ts', '.tsx', '.jsx', '.css', '.scss'],
		},
	};
};
