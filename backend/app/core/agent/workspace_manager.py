"""Authoritative Session Workspace Manager for candidate challenges."""

import difflib
import os
import shutil
from pathlib import Path
from typing import Any


class WorkspaceSecurityError(Exception):
    """Raised when a file path violates workspace security invariants."""


class SessionWorkspaceManager:
    """Manages isolated disk-backed candidate workspaces for interview sessions."""

    PROHIBITED_FILENAMES = {".env", ".env.local", ".git", "id_rsa", "id_ed25519"}
    PROHIBITED_EXTENSIONS = {".key", ".pem", ".p12", ".pfx"}

    def __init__(self, base_storage_dir: Path | str | None = None) -> None:
        if base_storage_dir is None:
            # Default to backend/workspace_storage
            backend_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.base_storage_dir = backend_dir / "workspace_storage"
        else:
            self.base_storage_dir = Path(base_storage_dir).resolve()

        self.base_storage_dir.mkdir(parents=True, exist_ok=True)
        self._revisions: dict[str, int] = {}

    def get_session_dir(self, session_id: str) -> Path:
        """Return the resolved session directory."""
        # Sanitize session_id to alphanumeric and hyphens/underscores
        clean_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).strip()
        if not clean_id:
            clean_id = "default-session"
        session_path = (self.base_storage_dir / clean_id).resolve()
        session_path.mkdir(parents=True, exist_ok=True)
        return session_path

    def initialize_ci001_workspace(self, session_id: str, force_reset: bool = False) -> Path:
        """Initialize session workspace by copying starter files from CI-001 template."""
        session_dir = self.get_session_dir(session_id)
        marker_file = session_dir / ".initialized"

        if marker_file.exists() and not force_reset:
            return session_dir

        backend_dir = Path(__file__).resolve().parent.parent.parent.parent
        starter_dir = backend_dir / "challenges" / "ci-001" / "starter"

        if starter_dir.exists():
            for item in starter_dir.iterdir():
                dest = session_dir / item.name
                if item.is_dir():
                    if dest.exists():
                        shutil.rmtree(dest)
                    shutil.copytree(item, dest)
                else:
                    shutil.copy2(item, dest)

        marker_file.write_text("initialized=true\n", encoding="utf-8")
        return session_dir

    def resolve_safe_path(self, session_id: str, relative_path: str) -> Path:
        """Resolve and strictly validate a path within the session workspace."""
        session_dir = self.get_session_dir(session_id)
        clean_rel = relative_path.replace("\\", "/").strip().lstrip("/")

        target = (session_dir / clean_rel).resolve()

        # Strict containment check (anti-path traversal)
        try:
            target.relative_to(session_dir)
        except ValueError as exc:
            raise WorkspaceSecurityError(
                f"Access denied: path '{relative_path}' resolves outside workspace boundary."
            ) from exc

        # Disallow prohibited file access
        if target.name in self.PROHIBITED_FILENAMES or target.suffix.lower() in self.PROHIBITED_EXTENSIONS:
            raise WorkspaceSecurityError(
                f"Access denied: access to sensitive file '{target.name}' is prohibited."
            )

        return target

    def list_files(self, session_id: str, subpath: str = "") -> list[dict[str, Any]]:
        """List files in the session workspace."""
        base_dir = self.resolve_safe_path(session_id, subpath) if subpath else self.get_session_dir(session_id)
        session_root = self.get_session_dir(session_id)

        results = []
        for root, dirs, files in os.walk(base_dir):
            # Prune hidden or system directories
            dirs[:] = [d for d in dirs if not d.startswith(".") and d != "__pycache__"]
            for file in files:
                if file.startswith(".") or file.endswith(".pyc"):
                    continue
                file_path = Path(root) / file
                rel_path = file_path.relative_to(session_root).as_posix()
                results.append(
                    {
                        "path": rel_path,
                        "size": file_path.stat().st_size,
                        "modified": file_path.stat().st_mtime,
                    }
                )
        return sorted(results, key=lambda x: x["path"])

    def read_file(self, session_id: str, relative_path: str) -> str:
        """Read text content of a workspace file."""
        target = self.resolve_safe_path(session_id, relative_path)
        if not target.exists() or not target.is_file():
            raise FileNotFoundError(f"File '{relative_path}' does not exist in workspace.")
        return target.read_text(encoding="utf-8", errors="replace")

    def search_code(self, session_id: str, query: str) -> list[dict[str, Any]]:
        """Search code for text occurrences across workspace files."""
        if not query or len(query.strip()) < 2:
            return []

        session_root = self.get_session_dir(session_id)
        matches = []

        for root, dirs, files in os.walk(session_root):
            dirs[:] = [d for d in dirs if not d.startswith(".") and d != "__pycache__"]
            for file in files:
                if file.startswith(".") or file.endswith((".pyc", ".png", ".jpg", ".ico")):
                    continue
                file_path = Path(root) / file
                rel_path = file_path.relative_to(session_root).as_posix()

                try:
                    lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
                    for idx, line in enumerate(lines, start=1):
                        if query.lower() in line.lower():
                            matches.append(
                                {
                                    "file": rel_path,
                                    "line_number": idx,
                                    "line_content": line.strip(),
                                }
                            )
                except Exception:
                    continue

        return matches[:50]  # Cap results for token safety

    def patch_file(
        self,
        session_id: str,
        relative_path: str,
        target_string: str,
        replacement_string: str,
    ) -> dict[str, Any]:
        """Atomically replace target_string with replacement_string in a workspace file."""
        target = self.resolve_safe_path(session_id, relative_path)
        if not target.exists():
            raise FileNotFoundError(f"File '{relative_path}' does not exist.")

        old_content = target.read_text(encoding="utf-8", errors="replace")
        if target_string not in old_content:
            raise ValueError(f"Target string not found in '{relative_path}'.")

        new_content = old_content.replace(target_string, replacement_string, 1)
        return self.edit_file(session_id, relative_path, new_content)

    def edit_file(
        self,
        session_id: str,
        relative_path: str,
        new_content: str,
        expected_old_content: str | None = None,
    ) -> dict[str, Any]:
        """Atomically edit a file in the workspace and produce a unified diff."""
        target = self.resolve_safe_path(session_id, relative_path)
        target.parent.mkdir(parents=True, exist_ok=True)

        old_content = ""
        if target.exists():
            old_content = target.read_text(encoding="utf-8", errors="replace")

        if expected_old_content is not None and old_content and expected_old_content.strip() not in old_content:
            raise ValueError(
                f"Edit conflict: target content in '{relative_path}' does not match expected state."
            )

        # Generate unified diff
        diff_lines = list(
            difflib.unified_diff(
                old_content.splitlines(keepends=True),
                new_content.splitlines(keepends=True),
                fromfile=f"a/{relative_path}",
                tofile=f"b/{relative_path}",
            )
        )
        diff_text = "".join(diff_lines)

        # Atomic write via temporary file
        temp_file = target.with_suffix(f"{target.suffix}.tmp")
        try:
            temp_file.write_text(new_content, encoding="utf-8")
            temp_file.replace(target)
        finally:
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass

        # Track revision
        rev_key = f"{session_id}:{relative_path}"
        current_rev = self._revisions.get(rev_key, 0) + 1
        self._revisions[rev_key] = current_rev

        return {
            "path": relative_path,
            "revision": current_rev,
            "diff": diff_text,
            "lines_changed": len([l for l in diff_lines if l.startswith(("+", "-")) and not l.startswith(("+++", "---"))]),
        }
