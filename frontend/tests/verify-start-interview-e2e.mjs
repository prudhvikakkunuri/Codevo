import assert from "node:assert/strict";

async function verify() {
  console.log("=== VERIFYING START INTERVIEW FLOW END-TO-END ===");

  // 1. Check Challenges Library
  console.log("1. Fetching Challenges Page (/app/challenges)...");
  const chalRes = await fetch("http://localhost:3000/app/challenges");
  assert.equal(chalRes.status, 200, "Challenges page should return 200");
  const chalText = await chalRes.text();
  assert.ok(chalText.includes("CI-001"), "Should include CI-001 challenge");
  console.log("   -> OK (200, contains CI-001)");

  // 2. Simulate Start Interview Click: Call Backend Init API
  console.log("2. Simulating Start Interview button click -> calling POST /api/v1/workspace/ci-001-demo/init...");
  const initRes = await fetch("http://127.0.0.1:8000/api/v1/workspace/ci-001-demo/init", {
    method: "POST",
  });
  assert.equal(initRes.status, 200, "Workspace init should return 200");
  const initData = await initRes.json();
  assert.equal(initData.session_id, "ci-001-demo");
  assert.ok(initData.files_count >= 10);
  console.log(`   -> OK (200, initialized ${initData.files_count} files for ${initData.session_id})`);

  // 3. Check Workspace Route (/app/workspace/ci-001-demo)
  console.log("3. Fetching Workspace Page (/app/workspace/ci-001-demo)...");
  const wsRes = await fetch("http://localhost:3000/app/workspace/ci-001-demo");
  assert.equal(wsRes.status, 200, "Workspace route should return 200");
  const wsText = await wsRes.text();
  assert.ok(wsText.includes("ci-001-demo") || wsText.includes("workspace"), "Should load workspace shell");
  console.log("   -> OK (200, loaded workspace)");

  // 4. Verify Files Loaded
  console.log("4. Fetching Workspace Files (/api/v1/workspace/ci-001-demo/files)...");
  const filesRes = await fetch("http://127.0.0.1:8000/api/v1/workspace/ci-001-demo/files");
  assert.equal(filesRes.status, 200, "Files endpoint should return 200");
  const filesData = await filesRes.json();
  assert.ok("documents" in filesData);
  assert.ok("app/utils/security.py" in filesData.documents);
  console.log(`   -> OK (200, ${Object.keys(filesData.documents).length} documents loaded with revisions)`);

  console.log("\nALL END-TO-END STEPS VERIFIED SUCCESSFULLY!");
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

