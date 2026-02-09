import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { apiServer } from './functions/api-server/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  apiServer
});

// --- Custom Python Function (CDK) ---
const pythonStack = backend.createStack('PythonProcessorStack');

const pythonProcessor = new lambda.Function(pythonStack, 'PythonProcessor', {
  code: lambda.Code.fromAsset('python_analysis'), // Relative to project root
  handler: 'amplify_processing_handler.lambda_handler',
  runtime: lambda.Runtime.PYTHON_3_11,
  timeout: Duration.seconds(60),
  memorySize: 512,
  environment: {
    PLAYER_VALUES_TABLE: backend.data.resources.tables['PlayerValue'].tableName,
    DATA_BUCKET_NAME: backend.storage.resources.bucket.bucketName
  }
});

// --- Permissions & Environment Variables ---

// 1. Python Processor Permissions
pythonProcessor.addToRolePolicy(
  new PolicyStatement({
    actions: ['s3:GetObject', 's3:ListBucket'],
    resources: [
      backend.storage.resources.bucket.bucketArn,
      `${backend.storage.resources.bucket.bucketArn}/*`
    ],
  })
);

pythonProcessor.addToRolePolicy(
  new PolicyStatement({
    actions: ['dynamodb:PutItem', 'dynamodb:BatchWriteItem', 'dynamodb:UpdateItem', 'dynamodb:GetItem', 'dynamodb:Scan'],
    resources: [backend.data.resources.tables['PlayerValue'].tableArn],
  })
);


// 2. API Server Permissions (needs to invoke Python)
backend.apiServer.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['s3:PutObject', 's3:GetObject', 's3:ListBucket'],
    resources: [
      backend.storage.resources.bucket.bucketArn,
      `${backend.storage.resources.bucket.bucketArn}/*`
    ],
  })
);

backend.apiServer.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [pythonProcessor.functionArn],
  })
);

// Add DynamoDB permissions to the API server Lambda for PlayerValue table access
// Updated: 2026-02-09 to ensure permissions are applied in production
backend.apiServer.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['dynamodb:GetItem', 'dynamodb:BatchGetItem', 'dynamodb:Scan', 'dynamodb:Query'],
    resources: [backend.data.resources.tables['PlayerValue'].tableArn],
  })
);

// Inject Env Vars
backend.apiServer.addEnvironment('DATA_BUCKET_NAME', backend.storage.resources.bucket.bucketName);
backend.apiServer.addEnvironment('PROCESSOR_FUNCTION_NAME', pythonProcessor.functionName);
backend.apiServer.addEnvironment('PLAYER_VALUES_TABLE_NAME', backend.data.resources.tables['PlayerValue'].tableName);

// Add Function URL for API access
const cfnFunction = backend.apiServer.resources.lambda.node.defaultChild as lambda.CfnFunction;
const functionUrl = backend.apiServer.resources.lambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [lambda.HttpMethod.ALL],
    allowedHeaders: ['*'],
  },
});

// Add outputs for the frontend
backend.addOutput({
  custom: {
    API_URL: functionUrl.url,
  },
});
