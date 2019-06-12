const path = require('path');

module.exports = {
	entry: './src/index.js',
	mode: 'development',
	devtool: 'inline-source-map',
	resolve: {
		extensions: ['*', '.js', '.jsx'],
		modules: [path.resolve(__dirname, 'src'), 'node_modules'],
	},
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, 'build'),
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: ['babel-loader'],
			},
		],
	},
};
