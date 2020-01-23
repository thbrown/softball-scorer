const path = require('path');
const srvUrl = 'http://localhost:8888';

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
  devServer: {
    contentBase: __dirname,
    compress: true,
    hot: true,
    liveReload: true,
    open: true,
    // openPage: '/',
    proxy: {
      // '/build/*': srvUrl,
      '/server/*': srvUrl,
    },
  },
};
