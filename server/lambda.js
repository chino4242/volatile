// server/lambda.js
const awsServerlessExpress = require('aws-serverless-express');
const app = require('./server'); // Import the Express app

// Create the server
const server = awsServerlessExpress.createServer(app);

// Lambda handler
exports.handler = (event, context) => {
    console.log("EVENT: " + JSON.stringify(event));

    // PAYLOAD V2 SUPPORT: Translate Function URL v2 event to v1 for aws-serverless-express
    if (event.requestContext && event.requestContext.http && event.requestContext.http.method) {
        console.log("Detected Payload Format 2.0 - Translating to v1");
        event.httpMethod = event.requestContext.http.method;
        event.path = event.rawPath;
        event.queryStringParameters = event.queryStringParameters || {};
        event.multiValueQueryStringParameters = {}; // Not strictly needed but good for completeness

        // Headers are already flat in v2, but v1 expects multiValueHeaders sometimes. 
        // aws-serverless-express handles flat headers fine usually, but let's ensure body is handled.

        // If body is base64 encoded by default in v2? Not always, checking isBase64Encoded
        // event.isBase64Encoded is present in v2.
    }

    awsServerlessExpress.proxy(server, event, context);
};
