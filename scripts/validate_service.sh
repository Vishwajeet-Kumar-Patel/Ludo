#!/bin/bash
# Check if server is responding
curl -f http://localhost:3000/api/health || exit 1
