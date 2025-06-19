require('dotenv').config();
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { HotModuleReplacementPlugin, DefinePlugin } = require('webpack');
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
				templateParameters: {
					PRODUCT_ID: process.env.PRODUCT_ID,
					TEXT_QUERY: process.env.TEXT_QUERY,
					IMAGE_URL: process.env.IMAGE_URL,
				},
			}),
			new HotModuleReplacementPlugin(),
			new DefinePlugin({
				'process.env.CAMERA_SEARCH_APP_KEY': JSON.stringify(process.env.MULTISEARCH_APP_KEY),
				'process.env.CAMERA_SEARCH_PLACEMENT_ID': JSON.stringify(process.env.MULTISEARCH_PLACEMENT_ID),
				'process.env.EMBEDDED_GRID_APP_KEY': JSON.stringify(process.env.RECOMMENDATION_APP_KEY),
				'process.env.EMBEDDED_GRID_PLACEMENT_ID': JSON.stringify(process.env.VISUALLY_SIMILAR_PLACEMENT_ID),
				'process.env.EMBEDDED_SEARCH_RESULTS_APP_KEY': JSON.stringify(process.env.MULTISEARCH_APP_KEY),
				'process.env.EMBEDDED_SEARCH_RESULTS_PLACEMENT_ID': JSON.stringify(process.env.MULTISEARCH_PLACEMENT_ID),
				'process.env.ICON_TRIGGERED_GRID_APP_KEY': JSON.stringify(process.env.RECOMMENDATION_APP_KEY),
				'process.env.ICON_TRIGGERED_GRID_PLACEMENT_ID': JSON.stringify(process.env.VISUALLY_SIMILAR_PLACEMENT_ID),
				'process.env.MERCHANDISE_SEARCH_BAR_APP_KEY': JSON.stringify(process.env.MULTISEARCH_APP_KEY),
				'process.env.MERCHANDISE_SEARCH_BAR_PLACEMENT_ID': JSON.stringify(process.env.MULTISEARCH_PLACEMENT_ID),
				'process.env.MORE_LIKE_THIS_APP_KEY': JSON.stringify(process.env.RECOMMENDATION_APP_KEY),
				'process.env.MORE_LIKE_THIS_PLACEMENT_ID': JSON.stringify(process.env.VISUALLY_SIMILAR_PLACEMENT_ID),
				'process.env.RECOMMEND_ME_APP_KEY': JSON.stringify(process.env.MULTISEARCH_APP_KEY),
				'process.env.RECOMMEND_ME_PLACEMENT_ID': JSON.stringify(process.env.MULTISEARCH_PLACEMENT_ID),
				'process.env.SEARCH_BAR_APP_KEY': JSON.stringify(process.env.MULTISEARCH_APP_KEY),
				'process.env.SEARCH_BAR_PLACEMENT_ID': JSON.stringify(process.env.MULTISEARCH_PLACEMENT_ID),
				'process.env.SHOP_THE_LOOK_APP_KEY': JSON.stringify(process.env.RECOMMENDATION_APP_KEY),
				'process.env.SHOP_THE_LOOK_PLACEMENT_ID': JSON.stringify(process.env.MODEL_OUTFIT_PLACEMENT_ID),
				'process.env.SHOPPABLE_GALLERY_APP_KEY': JSON.stringify(process.env.RECOMMENDATION_APP_KEY),
				'process.env.SHOPPABLE_GALLERY_PLACEMENT_ID': JSON.stringify(process.env.GALLERY_PLACEMENT_ID),
				'process.env.SHOPPABLE_LOOKBOOK_APP_KEY': JSON.stringify(process.env.RECOMMENDATION_APP_KEY),
				'process.env.SHOPPABLE_LOOKBOOK_PLACEMENT_ID': JSON.stringify(process.env.VISUALLY_SIMILAR_PLACEMENT_ID),
				'process.env.SHOPPING_ASSISTANT_APP_KEY': JSON.stringify(process.env.MULTISEARCH_APP_KEY),
				'process.env.SHOPPING_ASSISTANT_PLACEMENT_ID': JSON.stringify(process.env.MULTISEARCH_PLACEMENT_ID),
				'process.env.SIMILAR_SEARCH_APP_KEY': JSON.stringify(process.env.MULTISEARCH_APP_KEY),
				'process.env.SIMILAR_SEARCH_PLACEMENT_ID': JSON.stringify(process.env.MULTISEARCH_PLACEMENT_ID),
			}),
		],
		resolve: {
			extensions: ['.js', '.ts', '.tsx', '.jsx', '.css', '.scss'],
		},
	};
};
