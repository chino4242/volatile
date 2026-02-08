#!/bin/bash

# Verification script for Amplify deployment

echo "🔍 Verifying Amplify Deployment Setup..."
echo ""

# Check if amplify_outputs.json exists
if [ -f "amplify_outputs.json" ]; then
    echo "✅ amplify_outputs.json found"
    
    # Extract API URL
    API_URL=$(node -e "try { console.log(require('./amplify_outputs.json').custom.API_URL) } catch(e) { console.log('Not found') }")
    
    if [ "$API_URL" != "Not found" ] && [ ! -z "$API_URL" ]; then
        echo "✅ API URL found: $API_URL"
        
        # Test the API endpoint
        echo ""
        echo "🧪 Testing API health endpoint..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}api/health" 2>/dev/null)
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ API is responding (HTTP $HTTP_CODE)"
        else
            echo "❌ API returned HTTP $HTTP_CODE"
        fi
    else
        echo "⚠️  API URL not found in amplify_outputs.json"
        echo "   Run: npx ampx sandbox"
    fi
else
    echo "⚠️  amplify_outputs.json not found"
    echo "   Run: npx ampx sandbox"
fi

echo ""

# Check if backend files exist
echo "📁 Checking backend files..."

if [ -f "amplify/backend.ts" ]; then
    echo "✅ amplify/backend.ts exists"
else
    echo "❌ amplify/backend.ts missing"
fi

if [ -f "server/lambda.js" ]; then
    echo "✅ server/lambda.js exists"
else
    echo "❌ server/lambda.js missing"
fi

if [ -f "amplify.yml" ]; then
    echo "✅ amplify.yml exists"
else
    echo "❌ amplify.yml missing"
fi

echo ""

# Check Node modules
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  Dependencies not installed"
    echo "   Run: npm install"
fi

echo ""
echo "📋 Summary:"
echo "   To deploy backend: npx ampx sandbox"
echo "   To deploy frontend: Connect repo to Amplify Console"
echo "   For details: See DEPLOYMENT.md"
