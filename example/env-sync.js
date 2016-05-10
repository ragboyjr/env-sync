const envSync = require('../index');
const crypto = require('crypto');

// calling main to handle actual syncing.
// this will configure the SECRET_KEY var if it is empty
envSync.main(envSync.config('.env', new Set(['SECRET_KEY']), function(key) {
    if (key == 'SECRET_KEY') {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(32, (err, buf) => {
                if (err) { reject(err); }
                resolve(buf.toString('base64'));
            });
        });
    }
}));
