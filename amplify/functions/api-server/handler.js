const serverlessExpress = require('@vendia/serverless-express');
const app = require('../../../server/server.js');

let cachedServer;

const handler = async (event, context) => {
  if (!cachedServer) {
    cachedServer = serverlessExpress({ app });
  }
  return cachedServer(event, context);
};

module.exports = { handler };
