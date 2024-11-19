// Copyright (C) 2012-present, The Authors. This program is free software: you can redistribute it and/or  modify it under the terms of the GNU Affero General Public License, version 3, as published by the Free Software Foundation. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.

const CompressionPlugin = require('compression-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const EventHooksPlugin = require('event-hooks-webpack-plugin')
const HtmlWebPackPlugin = require('html-webpack-plugin')
const path = require('path')
const webpack = require('webpack')
const writeHeadersJsonTask = require('./writeHeadersJsonTask')

require('dotenv').config()

const isDevelopment = process.env.NODE_ENV !== 'production'
const enableTwitterWidgets = process.env.ENABLE_TWITTER_WIDGETS === 'true'
const fbAppId = process.env.FB_APP_ID
const serviceUrl = process.env.SERVICE_URL

module.exports = {
  entry: './src/index',
  mode: isDevelopment ? 'development' : 'production',
  output: {
    filename: isDevelopment ? 'admin_bundle.js' : 'admin_bundle.[contenthash].js',
    path: path.resolve(__dirname, 'build'),
    publicPath: '/',
    clean: true
  },
  devtool: isDevelopment ? 'inline-source-map' : 'source-map',
  devServer: isDevelopment
    ? {
        static: {
          directory: path.join(__dirname, 'build')
        },
        compress: true,
        port: 9000,
        hot: true,
        historyApiFallback: true
      }
    : undefined,
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      },
      {
        test: /\.md$/,
        use: 'raw-loader'
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'public', globOptions: { ignore: ['**/index.ejs'] } }]
    }),
    new HtmlWebPackPlugin({
      template: 'public/index.ejs',
      filename: isDevelopment ? 'index.html' : 'index_admin.html',
      templateParameters: {
        enableTwitterWidgets,
        fbAppId
      }
    }),
    new webpack.DefinePlugin({
      'process.env.FB_APP_ID': JSON.stringify(fbAppId),
      'process.env.SERVICE_URL': JSON.stringify(serviceUrl)
    }),
    ...(isDevelopment
      ? []
      : [
          new CompressionPlugin({
            test: /\.js$/,
            filename: '[path][base]',
            deleteOriginalAssets: true
          })
        ]),
    new EventHooksPlugin({
      afterEmit: () => writeHeadersJsonTask()
    })
  ],
  performance: {
    hints: isDevelopment ? false : 'warning'
  }
}
