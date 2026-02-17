const { defineFunction } = require('@aws-amplify/backend');

exports.apiServer = defineFunction({
    name: 'api-server',
    entry: './handler.js',
    runtime: 20,
    timeoutSeconds: 60,
    memoryMB: 1024
});
