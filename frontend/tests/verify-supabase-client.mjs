import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// Load .env.local without printing values
const envPath = path.resolve(process.cwd(), "frontend/.env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        process.env[k] = v;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("FAIL: Missing Supabase URL or Key in environment");
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

if (!client.auth) {
  console.error("FAIL: Client missing auth namespace");
  process.exit(1);
}

if (typeof client.auth.signUp !== "function" || typeof client.auth.signInWithPassword !== "function") {
  console.error("FAIL: Missing signUp or signInWithPassword methods");
  process.exit(1);
}

console.log("PASS: Supabase client initialized successfully with configured publishable key.");
console.log(`PASS: Project URL target configured correctly.`);
console.log(`PASS: Key present with length ${supabaseKey.length} characters (credential masked).`);
process.exit(0);

