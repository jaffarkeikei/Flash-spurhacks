#!/bin/bash

# Find an available port starting from 7000
PORT=7000
MAX_PORT=9000

find_available_port() {
  while [ $PORT -lt $MAX_PORT ]; do
    if ! lsof -i :$PORT > /dev/null 2>&1; then
      echo "Found available port: $PORT"
      return 0
    fi
    PORT=$((PORT + 1))
  done
  echo "Error: Could not find available port between $PORT and $MAX_PORT"
  exit 1
}

# Find an available port
find_available_port

# Update the .env file with the new port - ONLY update the application PORT, not DB_PORT
sed -i '' 's/^PORT=.*/PORT='$PORT'/g' .env

# Ensure DB_PORT is set to 5432 (standard PostgreSQL port)
if grep -q "DB_PORT" .env; then
  sed -i '' 's/^DB_PORT=.*/DB_PORT=5432/g' .env
else
  echo "DB_PORT=5432" >> .env
fi

echo "Updated .env with PORT=$PORT and DB_PORT=5432"

# Start the application
echo "Starting FlashSettle on http://localhost:$PORT"
npm run dev 