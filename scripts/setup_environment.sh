#!/bin/bash
cd /home/ec2-user/ludo-backend
# Copy environment file (stored securely in Parameter Store or Secrets Manager)
aws ssm get-parameter --name "/ludo/backend/env" --with-decryption --query "Parameter.Value" --output text > .env
