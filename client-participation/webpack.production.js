const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const { writeHeadersJson } = require('./writeHeadersJsonTask');
const CompressionPlugin = require('compression-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');
const pkg = require('./package.json');

const fbAppId = process.env.FB_APP_ID;
const gaTrackingId = process.env.GA_TRACKING_ID;

module.exports = (/*env, argv*/) => ({
  mode: 'production',
  devtool: 'source-map', // Production-suitable source maps
  
  output: {
    filename: 'js/[name].[contenthash].js',
    chunkFilename: 'js/[name].[contenthash].chunk.js'
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
      }),
      new CssMinimizerPlugin(), // Optimize CSS
    ],
    splitChunks: {
      chunks: 'all',
      name: false, // Don't use named chunks in production
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
    runtimeChunk: {
      name: 'runtime',
    },
  },

  plugins: [
    // Compress assets
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240, // Only compress files > 10kb
      minRatio: 0.8,
      deleteOriginalAssets: false // Keep originals for clients that don't support gzip
    }),
    
    // Generate a manifest file for asset management
    new WebpackManifestPlugin({
      fileName: 'asset-manifest.json',
    }),

    // Generate headers after build
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('HeadersJsonPlugin', () => {
          console.log('Writing *.headersJson files...');
          writeHeadersJson();
        });
      },
    },

    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, 'public/index.ejs'),
      filename: 'index.html',
      templateParameters: {
        versionString: pkg.version,
        fbAppId,
        gaTrackingId,
        // Populated by the server
        preloadData: 'REPLACE_THIS_WITH_PRELOAD_DATA'
      }
    }),
  ],

  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
    hints: 'warning'
  },
});
