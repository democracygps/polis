const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const fbAppId = process.env.FB_APP_ID;
const gaTrackingId = process.env.GA_TRACKING_ID;

module.exports = (/*env, argv*/) => ({
  mode: 'development',
  devtool: 'eval-source-map',

  output: {
    filename: 'js/[name].js',
    chunkFilename: 'js/[name].chunk.js',
  },

  devServer: {
    port: process.env.PORT || 5030,
    hot: true,
    historyApiFallback: true,

    static: {
      directory: path.join(__dirname, 'dist'),
      watch: true,
    },

    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      progress: true,
    },
    
    proxy: [{
      context: ['/api'],
      target: process.env.API_URL || 'http://localhost:5000',
      changeOrigin: true,
    }],

    watchFiles: {
      paths: ['src/**/*', 'public/**/*'],
      options: {
        usePolling: false,
      },
    },

    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },

  plugins: [
    // Prevent recompilation for some files
    new webpack.WatchIgnorePlugin({
      paths: [
        /\.js$/
      ],
    }),
    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, 'public/index.ejs'),
      filename: 'index.html',
      templateParameters: {
        versionString: 'development',
        fbAppId,
        gaTrackingId,
        preloadData: `{
          conversation: {},
          firstComment: null,
          firstConv: {},
          firstUser: null,
          firstPtpt: null,
          firstVotesByMe: null,
          firstMath: null,
          firstFamous: null,
          acceptLanguage: null
        }`
      }
    }),
  ],

  optimization: {
    minimize: false,
    splitChunks: {
      chunks: 'all',
    },
  },

  // More detailed build information
  stats: {
    colors: true,
    modules: true,
    reasons: true,
    errorDetails: true,
  },
});
