import { defineFunction } from '@aws-amplify/backend';

export const apiServer = defineFunction({
    name: 'api-server',
    entry: '../../../server/lambda.js',
    runtime: 20, // Node.js 20
    timeoutSeconds: 30,
    memoryMB: 512,
    environment: {
        // S3 and Lambda names will be injected
    }
});
