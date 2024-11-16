const { whenDev } = require('@craco/craco');

module.exports = {
  webpack: {
    configure: {
      target: 'electron-renderer',
      optimization: {
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 50000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
        runtimeChunk: 'single',
        minimize: true,
      },
      resolve: {
        fallback: {
          "path": false,
          "fs": false,
          "crypto": false
        }
      }
    }
  },
  devServer: whenDev(() => ({
    devMiddleware: {
      writeToDisk: true
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      return middlewares;
    }
  }))
};
