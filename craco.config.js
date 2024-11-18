const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Production optimizations
      if (env === 'production') {
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            minSize: 20000,
            maxSize: 244000,
            minChunks: 1,
            maxAsyncRequests: 30,
            maxInitialRequests: 30,
            cacheGroups: {
              defaultVendors: {
                test: /[\\/]node_modules[\\/]/,
                priority: -10,
                reuseExistingChunk: true,
              },
              mui: {
                test: /[\\/]node_modules[\\/]@mui[\\/]/,
                name: 'mui',
                chunks: 'all',
                priority: 5,
              },
              default: {
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true,
              },
            },
          },
        };

        // Tree shaking for @mui/icons-material
        webpackConfig.module.rules.push({
          test: /@mui[\\/]icons-material[\\/].*\.js$/,
          sideEffects: false
        });
      }

      return {
        ...webpackConfig,
        externals: {
          electron: 'require("electron")'
        },
        target: 'web'
      };
    },
  },
};
