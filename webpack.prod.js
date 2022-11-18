const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  performance: { hints: false },
  resolve: {
    extensions: ['*', '.js', '.jsx'],
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    fallback: {
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
    },
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'build/server'),
    publicPath: '/server/',
    clean: true,
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
          to: path.join(__dirname, './build/server/assets'),
        },
      ],
      options: {
        concurrency: 100,
      },
    }),
  ],
};
