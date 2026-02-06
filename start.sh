#!/bin/sh

# Initialize database
node init-db.js

# Start the server
exec node server.js
