const path = require('path');
const srvUrl = 'http://localhost:8888';
const WebpackBeforeBuildPlugin = require('before-build-webpack');
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
    path: path.resolve(__dirname, 'build'),
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
      '/service-worker': srvUrl,
      '/favicon.ico': srvUrl,
      '/robots.txt': srvUrl,
    },
  },
};
