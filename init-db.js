const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbPath = '/app/data/prod.db';

if (!fs.existsSync(dbPath)) {
  console.log('Initializing database...');
  try {
    execSync('node node_modules/prisma/build/index.js db push --skip-generate', {
      cwd: '/app',
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` }
    });
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    // Continue anyway - database might be fine
  }
} else {
  console.log('Database already exists');
}
