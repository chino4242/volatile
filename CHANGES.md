# Changes Made to Fix Bad Gateway Error

## Problem
The application was configured to deploy only the React frontend to Amplify Hosting, but the Express backend server wasn't being deployed, causing 502 Bad Gateway errors when the frontend tried to call the API.

## Solution
Configured the Express server to deploy as a Lambda function with a Function URL, properly integrated with Amplify Gen 2.

## Files Modified

### 1. `amplify/backend.ts`
**Added:**
- Function URL configuration for the API Lambda
- CORS settings allowing all origins
- Output configuration to expose the API URL to the frontend

```typescript
const functionUrl = backend.apiServer.resources.lambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [lambda.HttpMethod.ALL],
    allowedHeaders: ['*'],
  },
});

backend.addOutput({
  custom: {
    API_URL: functionUrl.url,
  },
});
```

### 2. `amplify.yml`
**Changed:**
- Added `npx ampx generate outputs` command to preBuild phase
- Modified build phase to extract API_URL from `amplify_outputs.json`
- Set `REACT_APP_API_URL` environment variable dynamically

**Before:**
```yaml
build:
  commands:
    - echo "REACT_APP_API_URL=$REACT_APP_API_URL" >> client/.env
    - npm run build
```

**After:**
```yaml
preBuild:
  commands:
    - npm ci
    - npx ampx generate outputs --branch $AWS_BRANCH --app-id $AWS_APP_ID
build:
  commands:
    - export REACT_APP_API_URL=$(node -e "console.log(require('./amplify_outputs.json').custom.API_URL)")
    - echo "REACT_APP_API_URL=$REACT_APP_API_URL" >> client/.env
    - npm run build
```

### 3. `server/lambda.js`
**Changed:**
- Updated Lambda handler to cache the serverless-express instance for better performance

**Before:**
```javascript
exports.handler = serverlessExpress({ app });
```

**After:**
```javascript
let serverlessExpressInstance;

exports.handler = async (event, context) => {
    serverlessExpressInstance = serverlessExpressInstance ?? serverlessExpress({ app });
    return serverlessExpressInstance(event, context);
};
```

### 4. `package.json`
**Added:**
- `build:server` script for production dependencies
- `deploy` script for easier deployment

## How It Works Now

1. **Backend Deployment:**
   - `npx ampx sandbox` deploys the Amplify backend
   - Creates Lambda function from `server/lambda.js` (which wraps Express)
   - Generates Function URL for HTTP access
   - Outputs API URL to `amplify_outputs.json`

2. **Frontend Deployment:**
   - Amplify Hosting builds the React app
   - During build, extracts API URL from `amplify_outputs.json`
   - Sets `REACT_APP_API_URL` environment variable
   - React app uses this URL to call the backend

3. **Request Flow:**
   ```
   User Browser → Amplify Hosting (React) → Lambda Function URL → Express Server (in Lambda) → DynamoDB/S3
   ```

## Next Steps

1. Deploy the backend:
   ```bash
   npx ampx sandbox
   ```

2. Connect your Git repo to Amplify Hosting (or deploy via CLI)

3. Verify the deployment by checking:
   - Lambda function exists in AWS Console
   - Function URL is accessible
   - Frontend can make API calls

See `DEPLOYMENT.md` for detailed deployment instructions.
