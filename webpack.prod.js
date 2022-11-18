const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  performance: { hints: false },
  resolve: {
    extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    fallback: {
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
    },
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'build'),
    publicPath: '/',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new CopyPlugin({
      patterns: [
        // Root files
        {
          from: path.join(__dirname, './public-root'),
          to: path.join(__dirname, './build'),
        },
        // Assets
        {
          from: path.join(__dirname, './assets'),
          to: path.join(__dirname, './build/assets'),
        },
        // Index
        {
          from: path.join(__dirname, './index.html'),
          to: path.join(__dirname, './build'),
        },
      ],
      options: {
        concurrency: 100,
      },
    }),
  ],
};
