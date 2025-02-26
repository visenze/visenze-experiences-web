const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { HotModuleReplacementPlugin } = require('webpack');
const { env } = require('process');
const getWebpackModule = require('./webpack.util');

module.exports = () => {
	const dir = env.widget_dir;
	const version = require('./src/version');
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
		],
		resolve: {
			extensions: ['.js', '.ts', '.tsx', '.jsx', '.css', '.scss'],
		},
	};
};
