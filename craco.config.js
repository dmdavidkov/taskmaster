const path = require('path');

module.exports = {
  webpack: {
    configure: {
      target: 'web',
      externals: {
        electron: 'require("electron")'
      }
    }
  },
  devServer: {
    port: 3000,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
};
