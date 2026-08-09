#!/usr/bin/env tsx

/**
 * Non-sensitive auth smoke test.
 * Prints ONLY a SUCCESS/FAILURE verdict and an error category — never a
 * secret, token, or any substring derived from one.
 * Run with: node build/scripts/auth-check.js (after `npm run build`)
 */

import * as dotenv from 'dotenv';
import { checkAuthentication } from '../src/auth/auth-check.js';

dotenv.config();

async function main(): Promise<void> {
  const result = await checkAuthentication();
  if (result.success) {
    console.log('AUTH_CHECK: SUCCESS');
    process.exit(0);
  }
  console.log(`AUTH_CHECK: FAILURE category=${result.category}`);
  process.exit(1);
}

main();
