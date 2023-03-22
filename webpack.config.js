const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
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

  const babelLoader = {
    test: /\.(js|jsx|ts|tsx)$/,
    exclude: /node_modules/,
    use: ['babel-loader'],
  };

  const loaders = {
    rules: [esbuild],
  };

  return loaders;
}

function getPlugins(env) {
  const tsChecker = new ForkTsCheckerPlugin();
  return [
    // tsChecker,
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new webpack.DefinePlugin({
      'process.env.WEBPACK_DEV_SERVER': JSON.stringify(''),
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.join(__dirname, './public-root'),
          to: path.join(__dirname, './build'),
        },
        {
          from: path.join(__dirname, './assets'),
          to: path.join(__dirname, './build/assets'),
        },
        {
          from: path.join(__dirname, './index.html'),
          to: path.join(__dirname, './build'),
        },
      ],
      options: {
        concurrency: 100,
      },
    }),
  ];
}

const srvUrl = 'http://localhost:8888';

module.exports = (env) => ({
  entry: [
    './src/index.js',
    'webpack/hot/dev-server',
    'webpack-dev-server/client?http://localhost:8889',
  ],
  mode: 'development',
  stats: 'errors-only',
  devtool: 'inline-source-map',
  resolve: {
    extensions: ['*', '.tsx', '.ts', '.jsx', '.js', '.json'],
    fallback: {
      buffer: require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
    },
    modules: ['node_modules', './src/'],
    alias: {
      SharedLib: path.resolve(__dirname, 'shared'),
      'shared-lib': path.resolve(__dirname, 'shared'),
    },
  },
  performance: {
    hints: false,
    maxEntrypointSize: 5120000,
    maxAssetSize: 5120000,
  },
  output: {
    path: path.resolve(__dirname, 'build/'),
    publicPath: '/',
    filename: 'main.js',
  },
  module: getLoaders(env),
  plugins: getPlugins(env),
  devServer: {
    open: ['index.html'],
    setupExitSignals: true,
    historyApiFallback: true,
    port: 8889,
    watchFiles: 'src/**/*',
    proxy: {
      '/menu/*': srvUrl,
      '/server/sync': srvUrl,
      '/server/*': srvUrl,
      '/web-workers/*': srvUrl,
      '/service-worker.js': srvUrl,
      '/favicon.ico': srvUrl,
      '/robots.txt': srvUrl,
      '/manifest.json': srvUrl,
    },
  },
});
