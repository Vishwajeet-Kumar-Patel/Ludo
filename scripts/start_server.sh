#!/bin/bash
cd /home/ec2-user/ludo-backend
pm2 start src/server.js --name ludo-backend || pm2 restart ludo-backend
