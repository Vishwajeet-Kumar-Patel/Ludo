#!/bin/bash

# AWS Deployment Script for Ludo Backend
# Usage: ./deploy.sh [environment]

ENVIRONMENT=${1:-production}

echo "🚀 Deploying to $ENVIRONMENT..."

# Build and test
echo "📦 Installing dependencies..."
npm ci --production

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Deployment aborted."
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deployment.tar.gz \
    src/ \
    package.json \
    package-lock.json \
    .env.example

# Upload to S3
echo "☁️  Uploading to S3..."
aws s3 cp deployment.tar.gz s3://ludo-backend-deployments/$ENVIRONMENT/$(date +%Y%m%d_%H%M%S).tar.gz

# Deploy to EC2 via CodeDeploy
echo "🔄 Triggering CodeDeploy..."
aws deploy create-deployment \
    --application-name ludo-backend \
    --deployment-group-name $ENVIRONMENT \
    --s3-location bucket=ludo-backend-deployments,key=$ENVIRONMENT/$(date +%Y%m%d_%H%M%S).tar.gz,bundleType=tgz

echo "✅ Deployment initiated successfully!"
echo "📊 Monitor deployment: https://console.aws.amazon.com/codesuite/codedeploy"
