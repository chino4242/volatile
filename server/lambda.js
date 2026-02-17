const serverlessExpress = require('@vendia/serverless-express');
const app = require('./server');

let serverlessExpressInstance;

const handler = async (event, context) => {
    console.log('--- LAMBDA ENTRY ---');
    console.log('Event path:', event.rawPath || event.path);
    console.log('Memory usage:', JSON.stringify(process.memoryUsage()));

    try {
        serverlessExpressInstance = serverlessExpressInstance ?? serverlessExpress({ app });
        const response = await serverlessExpressInstance(event, context);
        console.log('--- LAMBDA SUCCESS ---');
        return response;
    } catch (error) {
        console.error('--- LAMBDA CRASH ---', error);
        throw error;
    }
};

exports.handler = handler;
module.exports.handler = handler;
