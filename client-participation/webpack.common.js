const CopyPlugin = require('copy-webpack-plugin');
const lodashTemplate = require('lodash/template');
const path = require('path');
const webpack = require('webpack');

const embedServiceHostname = process.env.EMBED_SERVICE_HOSTNAME || 'pol.is';
const fbAppId = process.env.FB_APP_ID;
const gaTrackingId = process.env.GA_TRACKING_ID;

module.exports = {
  entry: [
    './js/main',
    './css/polis_main.scss'
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash].js',
    publicPath: '/',
    clean: true
  },
  resolve: {
    extensions: ['.js', '.jsx', '.css', '.png', '.svg'],
    alias: {
      'handlebars': path.resolve(__dirname, 'node_modules/handlebars/dist/cjs/handlebars.runtime.js'),
      'handlebones': path.resolve(__dirname, 'node_modules/handlebones/handlebones'),
      // 'deepcopy': path.resolve(__dirname, 'node_modules/deepcopy/deepcopy.js')
    },
    fallback: {
      util: require.resolve('util/')
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser'
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public', globOptions: { ignore: ['**/index.ejs'] } },
        { from: 'api', globOptions: { ignore: ['**/embed.js'] } },
        {
          from: 'api/embed.js',
          transform(content) {
            return lodashTemplate(content.toString())({ embedServiceHostname })
          }
        },
        { from: 'node_modules/font-awesome/fonts/**/*', to: './fonts/[name][ext]' }
      ]
    }),
    new webpack.DefinePlugin({
      'process.env.FB_APP_ID': JSON.stringify(fbAppId),
      'process.env.GA_TRACKING_ID': JSON.stringify(gaTrackingId),
    })
  ],
  module: {
    rules: [
      // Handlebars templates
      {
        test: /\.handlebars$/,
        exclude: /node_modules/,
        loader: 'handlebars-loader',
        options: {
          ignorePartials: true // We load partials at runtime
        }
      },
      // JavaScript files
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/react']
          }
        }
      },
      // SCSS files
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'file-loader',
            options: { 
              outputPath: 'css/',
              name: 'polis.css'
            }
          },
          'sass-loader'
        ]
      },
      // Legacy module shims
      {
        test: /d3-tip/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/react'],
            sourceType: 'script' // set 'this' to 'window'
          }
        }
      },
      // {
      //   test: /deepcopy/,
      //   use: {
      //     loader: 'babel-loader',
      //     options: {
      //       presets: ['@babel/preset-env', '@babel/react'],
      //       sourceType: 'script' // set 'this' to 'window'
      //     }
      //   }
      // },
      {
        test: /bootstrap\/(transition|button|tooltip|affix|dropdown|collapse|popover|tab|alert)/,
        use: [{
          loader: 'imports-loader',
          options: {
            imports: ['default jquery jQuery']
          }
        }]
      },
      {
        test: /backbone\/backbone$/,
        use: [{
          loader: 'imports-loader',
          options: {
            imports: [
              'default jquery $',
              'default lodash _'
            ]
          }
        }]
      },
      {
        test: /handlebones$/,
        use: [{
          loader: 'imports-loader',
          options: {
            imports: [
              'default handlebars Handlebars',
              'default backbone Backbone',
              'default lodash _'
            ]
          }
        }]
      }
    ]
  }
};