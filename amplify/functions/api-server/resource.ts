import { defineFunction } from '@aws-amplify/backend';

export const apiServer = defineFunction({
    name: 'api-server',
    entry: '../../../server/lambda.js',
    runtime: 20, // Node.js 20
    timeoutSeconds: 30,
    memoryMB: 512,
    bundling: {
        loader: {
            '.json': 'copy' // Copy JSON files instead of inlining them
        },
        externalModules: [] // Don't externalize any modules
    },
    environment: {
        // S3 and Lambda names will be injected
    }
});
