import { defineFunction } from '@aws-amplify/backend';

export const apiServer = defineFunction({
    name: 'api-server',
    entry: './handler.js',
    runtime: 20,
    timeoutSeconds: 30,
    memoryMB: 512,
    bundling: {
        nodeModules: [
            '@vendia/serverless-express',
            '@aws-sdk/client-dynamodb',
            '@aws-sdk/client-lambda',
            '@aws-sdk/client-s3',
            '@aws-sdk/lib-dynamodb',
            'axios',
            'cors',
            'dotenv',
            'express',
            'fs-extra',
            'multer'
        ],
        externalModules: [],
        commandHooks: {
            beforeBundling: (inputDir, outputDir) => [],
            afterBundling: (inputDir, outputDir) => [
                `cp -r ${inputDir}/../../../server ${outputDir}/server`
            ],
            beforeInstall: (inputDir, outputDir) => []
        }
    }
});
