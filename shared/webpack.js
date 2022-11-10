const path = require('path');

module.exports = {
  entry: './index.js',
  mode: 'development',
  performance: { hints: false },
  resolve: {
    extensions: ['*', '.js', '.jsx'],
    fallback: {
      buffer: require.resolve('buffer/'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
    },
  },
  output: {
    filename: 'shared-lib.js',
    path: path.resolve(__dirname, '../'),
    library: {
      type: 'commonjs',
    },
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
  externals: {
    buffer: {
      commonjs: 'buffer',
    },
    crypto: {
      commonjs: 'crypto',
    },
    stream: {
      commonjs: 'stream',
    },
    react: {
      commonjs: 'react',
    },
    'react-dom/server': {
      commonjs: 'react-dom/server',
    },
    'node-object-hash': {
      commonjs: 'node-object-hash',
    },
    'base-x': {
      commonjs: 'base-x',
    },
  },
};
