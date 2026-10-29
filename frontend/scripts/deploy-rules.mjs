#!/usr/bin/env node
/**
 * Publishes firebase/firestore.rules to the live project.
 *
 *   node scripts/deploy-rules.mjs
 *
 * Used by the deploy workflow instead of `firebase deploy`, because the
 * firebase-adminsdk service account can release rules but is not allowed to
 * check which Google APIs are enabled, which `firebase deploy` does first.
 * Reads FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 from the environment.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getSecurityRules } from 'firebase-admin/security-rules'

const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
if (!key) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 must be set')
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(Buffer.from(key, 'base64').toString('utf8'))) })

const source = readFileSync(resolve(import.meta.dirname, '../../firebase/firestore.rules'), 'utf8')
const ruleset = await getSecurityRules().releaseFirestoreRulesetFromSource(source)
console.log(`Released Firestore ruleset ${ruleset.name}`)
