#!/bin/sh

# Initialize database if it doesn't exist
if [ ! -f /app/data/prod.db ]; then
  echo "Initializing database..."
  npx prisma db push --skip-generate
fi

# Start the server
exec node server.js
