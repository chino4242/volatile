const { defineFunction } = require('@aws-amplify/backend');

exports.apiServer = defineFunction({
    name: 'api-server',
    entry: './handler.js',
    runtime: 20,
    timeoutSeconds: 30,
    memoryMB: 512
});
