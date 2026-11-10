// next.config.js
const path = require('path')

module.exports = {
    experimental: {
        externalDir: true,
    },
    webpack(config) {
        config.resolve.modules.push(path.resolve('./'));
        return config;
    },
}
