// server/lambda.js
const awsServerlessExpress = require('aws-serverless-express');
const app = require('./server'); // Import the Express app

// Create the server
const server = awsServerlessExpress.createServer(app);

// Lambda handler
exports.handler = (event, context) => {
    console.log("EVENT: " + JSON.stringify(event));
    awsServerlessExpress.proxy(server, event, context);
};
