const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const { HotModuleReplacementPlugin } = require('webpack');
const { env } = require('process');
const getWebpackModule = require('./webpack.util');

module.exports = (config) => {
	let entry = 'index-dev.tsx';
	let dir = config.dir || env.dir;
	let version = require(`./src/version`);
	let packageName = dir.split('/').pop().replaceAll('-', '_');
	let useShadowDom = true;
	let customBuild = config.customBuild || env.custom_build;
	if (customBuild) {
		useShadowDom = false;
	}
	const directory = 'src/' + (customBuild ? `${customBuild}/${dir}` : dir);
	return {
		devtool: 'source-map',
		entry: path.resolve(directory, entry),
		output: {
			path: path.resolve(directory, 'dist'),
			filename: 'index_bundle.js',
			publicPath: '/',
		},
		mode: 'development',
		module: getWebpackModule(packageName, version, useShadowDom),
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
			alias: {
				environment$: path.resolve(__dirname, 'environment/environment.dev.ts'),
			},
		},
	};
};
