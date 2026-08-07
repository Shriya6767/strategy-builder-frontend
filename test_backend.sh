#!/bin/bash

# Test script to verify backend /get-strategy endpoint
# Replace STRATEGY_ID and STRATEGY_NAME with actual values from your database

BACKEND_URL="http://192.168.0.125:8000"
STRATEGY_ID="1"  # Change this to a real strategy ID
STRATEGY_NAME="Test Strategy"  # Change this to a real strategy name

echo "Testing backend endpoint..."
echo "URL: ${BACKEND_URL}/api/get-strategy"
echo "Parameters: strategy_id=${STRATEGY_ID}, strategy_name=${STRATEGY_NAME}"
echo ""

# URL encode the strategy name
ENCODED_NAME=$(echo "$STRATEGY_NAME" | jq -sRr @uri)

# Make the request
curl -v \
  -H "Content-Type: application/json" \
  "${BACKEND_URL}/api/get-strategy?strategy_id=${STRATEGY_ID}&strategy_name=${ENCODED_NAME}"

echo ""
echo ""
echo "If you see a 404 error, the endpoint path might be wrong."
echo "If you see a 500 error, check the backend logs for details."
echo "If you see success:true, the backend is working correctly!"
