"""Audited Tool definitions and dispatcher for the Codevo interview coding agent."""

import json
import logging
from pathlib import Path
from typing import Any

from app.core.agent.workspace_manager import SessionWorkspaceManager
from app.core.ai.models import ToolDefinition, ToolFunctionDefinition
from app.core.runner.isolated_runner import IsolatedTestRunner, TestRunResult

logger = logging.getLogger("codevo.agent.tools")

AGENT_TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        function=ToolFunctionDefinition(
            name="list_files",
            description="List all files in the candidate workspace with relative paths and sizes.",
            parameters={
                "type": "object",
                "properties": {
                    "subpath": {
                        "type": "string",
                        "description": "Optional subdirectory relative to workspace root.",
                    }
                },
                "required": [],
            },
        )
    ),
    ToolDefinition(
        function=ToolFunctionDefinition(
            name="read_file",
            description="Read the complete text content of a file in the workspace.",
            parameters={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the file relative to the workspace root.",
                    }
                },
                "required": ["path"],
            },
        )
    ),
    ToolDefinition(
        function=ToolFunctionDefinition(
            name="search_code",
            description="Search for a text string or identifier across workspace code files.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Text substring or symbol to search for.",
                    }
                },
                "required": ["query"],
            },
        )
    ),
    ToolDefinition(
        function=ToolFunctionDefinition(
            name="patch_file",
            description="Replace an exact target snippet with replacement text in a file. Generates and returns a unified diff.",
            parameters={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to file relative to workspace root.",
                    },
                    "target": {
                        "type": "string",
                        "description": "Exact text substring to be replaced.",
                    },
                    "replacement": {
                        "type": "string",
                        "description": "New replacement string.",
                    },
                },
                "required": ["path", "target", "replacement"],
            },
        )
    ),
    ToolDefinition(
        function=ToolFunctionDefinition(
            name="edit_file",
            description="Atomically modify a file in the workspace. Returns the unified diff of the changes.",
            parameters={
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the file relative to workspace root.",
                    },
                    "new_content": {
                        "type": "string",
                        "description": "Complete new content to write to the file.",
                    },
                },
                "required": ["path", "new_content"],
            },
        )
    ),
    ToolDefinition(
        function=ToolFunctionDefinition(
            name="run_tests",
            description="Run the authoritative test suite against the current workspace in an isolated runner.",
            parameters={
                "type": "object",
                "properties": {
                    "filter": {
                        "type": "string",
                        "description": "Optional test name filter pattern (default empty string to run all tests).",
                    }
                },
                "required": [],
            },
        )
    ),
]


class AgentToolDispatcher:
    """Dispatches tool calls securely to the workspace manager and test runner."""

    def __init__(
        self,
        workspace_manager: SessionWorkspaceManager,
        test_runner: IsolatedTestRunner,
        trusted_tests_dir: Path | None = None,
    ) -> None:
        self.workspace_manager = workspace_manager
        self.test_runner = test_runner
        self._session_reads: dict[str, set[str]] = {}
        if trusted_tests_dir is None:
            backend_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.trusted_tests_dir = backend_dir / "challenges" / "ci-001" / "trusted_tests"
        else:
            self.trusted_tests_dir = Path(trusted_tests_dir).resolve()

    async def execute_tool(
        self,
        session_id: str,
        tool_name: str,
        arguments_json: str,
    ) -> dict[str, Any]:
        """Execute a tool securely, enforcing workspace constraints."""
        try:
            args = json.loads(arguments_json) if arguments_json else {}
        except Exception as exc:
            return {"error": f"Invalid JSON arguments: {exc}"}

        logger.info("Executing tool '%s' for session '%s'", tool_name, session_id)

        try:
            if tool_name == "list_files":
                subpath = args.get("subpath", "")
                files = self.workspace_manager.list_files(session_id, subpath)
                return {"files": files, "count": len(files)}

            elif tool_name == "read_file":
                path = args.get("path")
                if not path:
                    return {"error": "Missing required argument 'path'"}
                if session_id not in self._session_reads:
                    self._session_reads[session_id] = set()

                if path in self._session_reads[session_id]:
                    return {
                        "path": path,
                        "status": "already_inspected",
                        "instruction": f"File '{path}' is already loaded in your memory. Please proceed directly to calling patch_file or run_tests.",
                    }

                self._session_reads[session_id].add(path)
                content = self.workspace_manager.read_file(session_id, path)
                return {
                    "path": path,
                    "content": content,
                    "instruction": "File content loaded. Now proceed directly to calling patch_file to apply the fix.",
                }

            elif tool_name == "search_code":
                query = args.get("query")
                if not query:
                    return {"error": "Missing required argument 'query'"}
                matches = self.workspace_manager.search_code(session_id, query)
                return {"query": query, "matches": matches, "match_count": len(matches)}

            elif tool_name == "patch_file":
                path = args.get("path")
                target = args.get("target")
                replacement = args.get("replacement")
                if not path or target is None or replacement is None:
                    return {"error": "Missing required arguments: path, target, replacement"}
                result = self.workspace_manager.patch_file(session_id, path, target, replacement)
                return {
                    "path": result["path"],
                    "revision": result["revision"],
                    "diff": result["diff"],
                    "lines_changed": result["lines_changed"],
                    "status": "success",
                }

            elif tool_name == "edit_file":
                path = args.get("path")
                new_content = args.get("new_content")
                if not path or new_content is None:
                    return {"error": "Missing required arguments 'path' and 'new_content'"}
                result = self.workspace_manager.edit_file(session_id, path, new_content)
                return {
                    "path": result["path"],
                    "revision": result["revision"],
                    "diff": result["diff"],
                    "lines_changed": result["lines_changed"],
                    "status": "success",
                }

            elif tool_name == "run_tests":
                ws_dir = self.workspace_manager.get_session_dir(session_id)
                res: TestRunResult = await self.test_runner.run_tests(
                    ws_dir,
                    self.trusted_tests_dir,
                    prefer_docker=True,
                )
                return {
                    "exit_code": res.exit_code,
                    "passed": res.passed,
                    "total_tests": res.total_tests,
                    "passed_tests": res.passed_tests,
                    "failed_tests": res.failed_tests,
                    "duration_seconds": round(res.duration_seconds, 2),
                    "runner_type": res.runner_type,
                    "stdout": res.stdout,
                }

            else:
                return {"error": f"Unknown tool: '{tool_name}'"}

        except Exception as exc:
            logger.error("Error executing tool '%s': %s", tool_name, exc)
            return {"error": str(exc)}
