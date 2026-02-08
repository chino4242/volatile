# Deployment Guide - AWS Amplify Gen 2

## Architecture

- **Frontend**: React app deployed to Amplify Hosting
- **Backend**: Express.js server running as Lambda Function with Function URL
- **Python Processor**: Lambda function for data processing
- **Storage**: S3 bucket for file uploads
- **Database**: DynamoDB for player values

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured
3. Node.js 20+ installed
4. Amplify CLI installed: `npm install -g @aws-amplify/cli`

## Deployment Steps

### 1. Deploy Backend Infrastructure

```bash
# Install dependencies
npm install

# Deploy Amplify backend (creates Lambda functions, DynamoDB, S3, etc.)
npx ampx sandbox
```

This will:
- Create the API server Lambda function
- Create the Python processor Lambda function
- Set up DynamoDB tables
- Create S3 bucket
- Generate `amplify_outputs.json` with resource details

### 2. Deploy Frontend to Amplify Hosting

#### Option A: Via Amplify Console (Recommended)

1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect your Git repository
4. Amplify will auto-detect `amplify.yml`
5. Click "Save and deploy"

#### Option B: Via CLI

```bash
# Initialize Amplify hosting
amplify hosting add

# Publish
amplify publish
```

### 3. Verify Deployment

After deployment completes:

1. Check `amplify_outputs.json` for the API URL:
   ```json
   {
     "custom": {
       "API_URL": "https://xxxxx.lambda-url.us-east-1.on.aws/"
     }
   }
   ```

2. Test the API endpoint:
   ```bash
   curl https://xxxxx.lambda-url.us-east-1.on.aws/api/health
   ```

3. Open your Amplify app URL and verify the frontend loads

## Environment Variables

The following environment variables are automatically configured:

**Lambda Function (API Server)**:
- `DATA_BUCKET_NAME` - S3 bucket for uploads
- `PROCESSOR_FUNCTION_NAME` - Python Lambda function name
- `PLAYER_VALUES_TABLE_NAME` - DynamoDB table name

**React Frontend**:
- `REACT_APP_API_URL` - Extracted from `amplify_outputs.json` during build

## Troubleshooting

### Bad Gateway Error

If you see a 502 Bad Gateway:

1. Check Lambda logs:
   ```bash
   aws logs tail /aws/lambda/api-server --follow
   ```

2. Verify the Lambda function has correct permissions
3. Check that all dependencies are installed in the Lambda package

### CORS Issues

The Function URL is configured with CORS allowing all origins. If you need to restrict:

Edit `amplify/backend.ts`:
```typescript
allowedOrigins: ['https://your-domain.com'],
```

### Missing Environment Variables

Verify environment variables in Lambda:
```bash
aws lambda get-function-configuration --function-name api-server
```

## Local Development

```bash
# Start all services locally
npm run dev
```

This runs:
- React dev server on port 3000
- Express server on port 5000
- Python API server on port 5002

## Cleanup

To delete all resources:

```bash
npx ampx sandbox delete
```

## Cost Considerations

- Lambda: Free tier includes 1M requests/month
- DynamoDB: Free tier includes 25GB storage
- S3: Free tier includes 5GB storage
- Amplify Hosting: Free tier includes 1000 build minutes/month

Monitor costs in AWS Cost Explorer.
