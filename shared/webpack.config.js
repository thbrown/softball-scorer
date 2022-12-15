const path = require('path');
const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin');

function getLoaders() {
  const esbuild = {
    test: /\.(js|jsx|ts|tsx)?$/,
    loader: 'esbuild-loader',
    options: {
      loader: 'tsx',
      target: 'es2015',
    },
    exclude: /node_modules/,
  };

  const loaders = {
    rules: [esbuild],
  };

  return loaders;
}

function getPlugins() {
  const tsChecker = new ForkTsCheckerPlugin();

  return [tsChecker];
}

module.exports = {
  entry: './index.js',
  mode: 'development', // set to development to prevent minification
  target: 'node',
  performance: { hints: false },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    fallback: {
      buffer: require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
    },
    modules: ['.', '../node_modules'],
  },
  output: {
    filename: 'shared-lib.js',
    path: path.resolve(__dirname, '../'),
    libraryTarget: 'commonjs-module',
    libraryExport: 'default',
  },
  module: getLoaders(),
  plugins: getPlugins(),
  externals: {
    buffer: 'buffer',
    crypto: 'crypto',
    stream: 'stream',
    react: 'react',
    'react-dom/server': 'react-dom/server',
    'node-object-hash': 'node-object-hash',
    'base-x': 'base-x',
  },
};
