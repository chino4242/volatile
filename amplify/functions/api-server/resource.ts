import { defineFunction } from '@aws-amplify/backend';

export const apiServer = defineFunction({
    name: 'api-server',
    entry: './handler.js',
    runtime: 20,
    timeoutSeconds: 30,
    memoryMB: 512,
});
