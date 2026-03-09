#!/usr/bin/env node
/**
 * One-time migration: encrypt existing plaintext API keys in organization_settings.
 *
 * Usage:
 *   ENCRYPTION_KEY=<hex> SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/encrypt-existing-keys.mjs
 *
 * Or with .env.local loaded:
 *   node -e "require('dotenv').config({path:'.env.local'})" && node scripts/encrypt-existing-keys.mjs
 *
 * Safe to run multiple times — already-encrypted values (enc:v1: prefix) are skipped.
 */

import { createClient } from '@supabase/supabase-js';
import { createCipheriv, randomBytes } from 'crypto';

const PREFIX = 'enc:v1:';

function getEncryptionKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    console.error('ERROR: ENCRYPTION_KEY must be a 64-char hex string. Set it in env.');
    process.exit(1);
  }
  return Buffer.from(keyHex, 'hex');
}

function encrypt(plaintext) {
  if (!plaintext || plaintext.startsWith(PREFIX)) return null; // skip null/empty/already encrypted
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) {
    console.error('ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  const { data: rows, error } = await supabase
    .from('organization_settings')
    .select('organization_id, ai_google_key, ai_openai_key, ai_anthropic_key');

  if (error) {
    console.error('Failed to fetch organization_settings:', error.message);
    process.exit(1);
  }

  console.log(`Found ${rows.length} organization(s).`);

  let updated = 0;
  for (const row of rows) {
    const updates = {};
    const encGoogle = encrypt(row.ai_google_key);
    const encOpenai = encrypt(row.ai_openai_key);
    const encAnthropic = encrypt(row.ai_anthropic_key);

    if (encGoogle) updates.ai_google_key = encGoogle;
    if (encOpenai) updates.ai_openai_key = encOpenai;
    if (encAnthropic) updates.ai_anthropic_key = encAnthropic;

    if (Object.keys(updates).length === 0) {
      console.log(`  ${row.organization_id}: all keys already encrypted or empty — skipped`);
      continue;
    }

    updates.updated_at = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('organization_settings')
      .update(updates)
      .eq('organization_id', row.organization_id);

    if (updateError) {
      console.error(`  ${row.organization_id}: FAILED — ${updateError.message}`);
    } else {
      const keys = Object.keys(updates).filter(k => k !== 'updated_at').join(', ');
      console.log(`  ${row.organization_id}: encrypted ${keys}`);
      updated++;
    }
  }

  console.log(`\nDone. ${updated}/${rows.length} organization(s) updated.`);
}

main();
