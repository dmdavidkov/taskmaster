const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  // Remove source maps in production
  const buildDir = path.join(context.appOutDir, 'resources/app/build');
  
  try {
    const files = fs.readdirSync(buildDir);
    files.forEach(file => {
      if (file.endsWith('.map')) {
        fs.unlinkSync(path.join(buildDir, file));
      }
    });

    // Remove unused locales
    const localesDir = path.join(context.appOutDir, 'locales');
    if (fs.existsSync(localesDir)) {
      const locales = fs.readdirSync(localesDir);
      locales.forEach(locale => {
        if (locale !== 'en-US.pak') {
          fs.unlinkSync(path.join(localesDir, locale));
        }
      });
    }
  } catch (error) {
    console.warn('Error in after-pack script:', error);
  }
};
