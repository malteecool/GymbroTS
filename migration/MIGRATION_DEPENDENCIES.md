# Firebase to Supabase Migration - Dependencies Guide

## Installing Migration Dependencies

The migration scripts require these npm packages:

```bash
npm install --save-dev dotenv firebase @supabase/supabase-js
```

## What Each Package Does

| Package | Purpose |
|---------|---------|
| **dotenv** | Loads environment variables from `.env.migration` file |
| **firebase** | Firebase SDK to read from Firestore |
| **@supabase/supabase-js** | Supabase SDK to write to PostgreSQL |

## Installation Steps

```bash
# From your project root directory
cd c:\Users\malte\Documents\Code\GymbroTS

# Install as dev dependencies (they're only needed for migration)
npm install --save-dev dotenv firebase @supabase/supabase-js

# Verify installation
npm list dotenv firebase @supabase/supabase-js
```

## Add NPM Scripts (Optional)

Update `package.json` to add convenience scripts:

```json
{
  "scripts": {
    "migrate:firebase": "node migrate-firebase-to-supabase.js",
    "migrate:verify": "node verify-migration.js"
  },
  "devDependencies": {
    "dotenv": "^16.0.0",
    "firebase": "^9.0.0",
    "@supabase/supabase-js": "^2.0.0"
  }
}
```

Then run with:

```bash
npm run migrate:firebase    # Run migration
npm run migrate:verify      # Verify migration
```

## Version Compatibility

Make sure your Firebase version matches what's in your main `package.json`:

```bash
# Check installed version
npm list firebase

# If different, sync versions:
npm install --save-dev firebase@9.0.0  # Or whatever version you're using
```

## Cleanup After Migration

Once migration is complete and verified, you can remove the migration dependencies:

```bash
# Remove migration-only packages
npm uninstall --save-dev dotenv firebase

# Keep @supabase/supabase-js since it's used in the app
npm uninstall --save-dev (or leave it if you want)

# Remove migration script files
rm migrate-firebase-to-supabase.js
rm verify-migration.js
rm .env.migration
```

## How to Access Packages

The migration scripts access these packages using:

```javascript
// Load environment variables
require('dotenv').config({ path: '.env.migration' });

// Firebase SDK
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Supabase SDK
const { createClient } = require('@supabase/supabase-js');
```

## If Installation Fails

Common issues:

1. **Node version too old** - Upgrade Node.js to v14+
   ```bash
   node --version  # Check current version
   ```

2. **npm version too old** - Update npm
   ```bash
   npm install -g npm@latest
   ```

3. **Connection issues** - Check internet and try again
   ```bash
   npm cache clean --force
   npm install --save-dev dotenv firebase @supabase/supabase-js
   ```

4. **Permissions error on Windows** - Run as Administrator or use:
   ```bash
   npm install --save-dev --legacy-peer-deps dotenv firebase @supabase/supabase-js
   ```

## Dependencies Tree

```
migrate-firebase-to-supabase.js
├── dotenv (loads .env.migration)
├── firebase (reads from Firestore)
│   └── firebaseConfig.js credentials
└── @supabase/supabase-js (writes to PostgreSQL)
    └── Supabase credentials from .env.migration

verify-migration.js
├── dotenv
├── firebase
└── @supabase/supabase-js
```

## Storage After Installation

All packages are installed in `node_modules/` directory. The migration scripts can access them via `require()`.

Space used:
- dotenv: ~20 KB
- firebase: ~2 MB
- @supabase/supabase-js: ~5 MB

Total additions: ~7 MB to `node_modules/`
