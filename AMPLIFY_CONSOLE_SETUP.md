# Amplify Console Configuration

## Required Environment Variables

When setting up your app in Amplify Console, you need to configure these environment variables:

### Build-time Variables

These are automatically handled by the `amplify.yml` build spec:

- `AWS_BRANCH` - Automatically provided by Amplify
- `AWS_APP_ID` - Automatically provided by Amplify
- `REACT_APP_API_URL` - Extracted from `amplify_outputs.json` during build

### Backend Variables

These are automatically injected into the Lambda function by `amplify/backend.ts`:

- `DATA_BUCKET_NAME` - S3 bucket name
- `PROCESSOR_FUNCTION_NAME` - Python Lambda function name
- `PLAYER_VALUES_TABLE_NAME` - DynamoDB table name

## Amplify Console Setup Steps

### 1. Connect Repository

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Select your Git provider (GitHub, GitLab, Bitbucket, etc.)
4. Authorize AWS Amplify to access your repository
5. Select the repository and branch

### 2. Configure Build Settings

Amplify should auto-detect the `amplify.yml` file. Verify it shows:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - npx ampx generate outputs --branch $AWS_BRANCH --app-id $AWS_APP_ID
    build:
      commands:
        - export REACT_APP_API_URL=$(node -e "console.log(require('./amplify_outputs.json').custom.API_URL)")
        - echo "REACT_APP_API_URL=$REACT_APP_API_URL" >> client/.env
        - npm run build
  artifacts:
    baseDirectory: client/build
    files:
      - '**/*'
```

### 3. Advanced Settings (Optional)

**Build Image:**
- Use default (Amazon Linux 2023)

**Service Role:**
- Create a new role or use existing with permissions for:
  - Amplify Backend (for `ampx generate outputs`)
  - CloudFormation (for backend resources)
  - Lambda, DynamoDB, S3 (for backend services)

**Monorepo Settings:**
- Not needed (this is a workspace, not a monorepo)

### 4. Deploy

Click "Save and deploy"

The build will:
1. Install dependencies
2. Generate `amplify_outputs.json` from your deployed backend
3. Extract the API URL
4. Build the React app with the correct API URL
5. Deploy to Amplify Hosting

## Troubleshooting Build Failures

### Error: "ampx: command not found"

**Solution:** Add to `amplify.yml` preBuild:
```yaml
- npm install -g @aws-amplify/backend-cli
```

### Error: "Cannot find module './amplify_outputs.json'"

**Cause:** Backend not deployed yet

**Solution:** Deploy backend first:
```bash
npx ampx sandbox
```

Then commit the generated `amplify_outputs.json` to your repo, or ensure the Amplify service role has permissions to generate it.

### Error: "Access Denied" when generating outputs

**Cause:** Amplify service role lacks permissions

**Solution:** Add these policies to the Amplify service role:
- `AmplifyBackendDeployFullAccess`
- `CloudFormationReadOnlyAccess`

### Build succeeds but app shows "Failed to fetch"

**Cause:** API URL not set correctly

**Solution:** 
1. Check build logs for the `REACT_APP_API_URL` value
2. Verify it matches the Lambda Function URL
3. Test the URL directly: `curl https://your-function-url.lambda-url.region.on.aws/api/health`

## Viewing Logs

### Build Logs
- Available in Amplify Console → Your App → Build history

### Lambda Logs
```bash
aws logs tail /aws/lambda/api-server --follow
```

### Frontend Logs
- Use browser DevTools Console
- Check Network tab for API calls

## Custom Domain (Optional)

1. In Amplify Console, go to "Domain management"
2. Click "Add domain"
3. Follow the wizard to configure DNS
4. Update CORS in `amplify/backend.ts` if needed:
   ```typescript
   allowedOrigins: ['https://yourdomain.com'],
   ```

## Continuous Deployment

Once configured, Amplify will automatically:
- Detect commits to your branch
- Run the build process
- Deploy updates

To disable auto-deploy:
- Go to App settings → Build settings
- Toggle "Automatic builds" off
