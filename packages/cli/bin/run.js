#!/usr/bin/env node

// Auto-load .env from the current working directory (where the user runs upriver)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
try {
  const dotenv = require('dotenv');
  dotenv.config();
} catch {
  // dotenv not available — env vars must be set manually
}

import { run } from '@oclif/core';
await run(process.argv.slice(2), import.meta.url);
