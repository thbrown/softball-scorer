const path = require('path');
const srvUrl = 'http://localhost:8888';
const WebpackBeforeBuildPlugin = require('before-build-webpack');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

const exec = require('child_process').exec;

const execAsync = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, result) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

module.exports = {
  entry: [
    './src/index.js',
    'webpack/hot/dev-server',
    'webpack-dev-server/client?http://localhost:8889',
  ],
  mode: 'development',
  devtool: 'inline-source-map',
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
    path: path.resolve(__dirname, 'build/'),
    publicPath: '/server/',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules|src-srv/,
        use: ['babel-loader'],
      },
    ],
  },
  plugins: [
    new WebpackBeforeBuildPlugin(async (stats, callback) => {
      await execAsync('yarn build-css');
      await execAsync('yarn update-service-worker');
      callback();
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new CopyPlugin({
      patterns: [
        // Root
        {
          from: path.join(__dirname, './public'),
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
  devServer: {
    compress: true,
    open: true,
    static: {
      directory: path.join(__dirname, './build'),
    },
    historyApiFallback: true,
    port: 8889,
    proxy: {
      '/server/*': srvUrl,
      '/service-worker.js': srvUrl,
      '/favicon.ico': srvUrl,
      '/robots.txt': srvUrl,
      '/manifest.json': srvUrl,
    },
  },
};
