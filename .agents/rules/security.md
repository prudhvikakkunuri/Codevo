---
trigger: model_decision
description: "Apply when handling authentication, API keys, user data, agent tools, terminal commands, code execution, hidden tests, or evaluation infrastructure."
---

# Codevo security rules

- Treat candidate code, repositories, terminal input, and uploaded content as untrusted.
- Never expose API keys, passwords, access tokens, hidden tests, reference patches, private rubrics, or secrets to browser/client tools.
- Never put secrets in source code, URLs, logs, screenshots, analytics, or committed documentation.
- Enforce authorization on the backend; frontend checks are not security boundaries.
- Scope file and command tools to the candidate workspace.
- Never execute untrusted code directly on the application host.
- Never mount host credentials or Docker socket into candidate containers.
- Default execution sandboxes to no outbound network and strict resource limits.
- Separate candidate-visible and evaluator-only challenge files.
- State security assumptions and unverified boundaries honestly.
