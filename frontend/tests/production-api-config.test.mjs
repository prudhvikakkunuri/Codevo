import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, "../src");

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

test("Production API URL Configuration and Hardcoding Prevention Suite", async (t) => {
  const allSourceFiles = getAllFiles(srcDir);

  await t.test("No frontend component or page hardcodes localhost:8000 or 127.0.0.1:8000", () => {
    const violations = [];
    const allowedPath = path.normalize(path.resolve(srcDir, "lib/supabase.ts"));

    for (const filePath of allSourceFiles) {
      if (path.normalize(filePath) === allowedPath) {
        continue;
      }
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes("localhost:8000") || content.includes("127.0.0.1:8000")) {
        violations.push(path.relative(srcDir, filePath));
      }
    }

    assert.equal(
      violations.length,
      0,
      `Found hardcoded localhost/127.0.0.1:8000 in frontend files: ${violations.join(", ")}`
    );
  });

  await t.test("All major workspace and assessment endpoints consume BACKEND_API_URL", () => {
    const dialogPath = path.resolve(srcDir, "components/application/challenges/challenge-details-dialog.tsx");
    const layoutPath = path.resolve(srcDir, "components/application/workspace/workspace-layout.tsx");
    const assistantPath = path.resolve(srcDir, "components/application/workspace/workspace-ai-assistant.tsx");
    const subDialogPath = path.resolve(srcDir, "components/application/workspace/workspace-submission-dialog.tsx");
    const historyPath = path.resolve(srcDir, "app/app/history/page.tsx");
    const resultsPath = path.resolve(srcDir, "app/app/results/[submissionId]/page.tsx");

    const files = [dialogPath, layoutPath, assistantPath, subDialogPath, historyPath, resultsPath];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      assert.ok(
        content.includes("BACKEND_API_URL"),
        `File ${path.basename(file)} must import and reference BACKEND_API_URL`
      );
    }
  });

  await t.test("getBackendUrl normalizes production URLs and strips trailing slashes", () => {
    function normalizeBackendUrl(apiUrl, defaultFallback = "http://localhost:8000") {
      return (apiUrl || defaultFallback).replace(/\/+$/, "");
    }

    // Trailing slash stripping
    assert.equal(
      normalizeBackendUrl("https://codevo-backend-a3s2.onrender.com/"),
      "https://codevo-backend-a3s2.onrender.com"
    );
    // Multiple trailing slashes
    assert.equal(
      normalizeBackendUrl("https://codevo-backend-a3s2.onrender.com///"),
      "https://codevo-backend-a3s2.onrender.com"
    );
    // No trailing slash
    assert.equal(
      normalizeBackendUrl("https://codevo-backend-a3s2.onrender.com"),
      "https://codevo-backend-a3s2.onrender.com"
    );
    // Fallback default
    assert.equal(
      normalizeBackendUrl(undefined),
      "http://localhost:8000"
    );
  });

  await t.test("INTERNAL_SERVICE_KEY is never exposed with NEXT_PUBLIC_ prefix in frontend", () => {
    for (const filePath of allSourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      assert.ok(
        !content.includes("NEXT_PUBLIC_INTERNAL_SERVICE_KEY"),
        `NEXT_PUBLIC_INTERNAL_SERVICE_KEY must never exist in client-side code: ${path.relative(srcDir, filePath)}`
      );
    }
  });
});

