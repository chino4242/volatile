const serverlessExpress = require('@vendia/serverless-express');
const app = require('./server');

let serverlessExpressInstance;

const handler = async (event, context) => {
    serverlessExpressInstance = serverlessExpressInstance ?? serverlessExpress({ app });
    return serverlessExpressInstance(event, context);
};

exports.handler = handler;
module.exports.handler = handler;
