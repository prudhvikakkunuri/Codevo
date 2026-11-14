"""Authoritative Session Workspace Manager for candidate challenges."""

import difflib
import os
import shutil
from pathlib import Path
from typing import Any


class WorkspaceSecurityError(Exception):
    """Raised when a file path violates workspace security invariants."""


class RevisionConflictError(Exception):
    """Raised when an update carries a stale base revision."""

    def __init__(
        self,
        path: str,
        expected_revision: int,
        current_revision: int,
        current_content: str,
    ) -> None:
        super().__init__(
            f"Revision conflict for '{path}': provided base_revision {expected_revision} "
            f"is older than authoritative server revision {current_revision}."
        )
        self.path = path
        self.expected_revision = expected_revision
        self.current_revision = current_revision
        self.current_content = current_content


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
        self._session_status: dict[str, str] = {}

    def is_session_submitted(self, session_id: str) -> bool:
        """Return True if the session has been submitted and locked in read-only mode."""
        clean_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).strip()
        return self._session_status.get(clean_id, "active") == "submitted"

    def submit_session(self, session_id: str) -> dict[str, Any]:
        """Mark a session as submitted, locking it into read-only mode."""
        clean_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).strip()
        self._session_status[clean_id] = "submitted"
        return {"session_id": clean_id, "status": "submitted"}

    def reset_session(self, session_id: str) -> None:
        """Reset session status back to active writable state."""
        clean_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).strip()
        self._session_status[clean_id] = "active"

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

        clean_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).strip()
        if force_reset or clean_id not in self._session_status:
            self._session_status[clean_id] = "active"

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
        # Initialize base revision to 1 for all starter files
        for f in self.list_files(session_id):
            rev_key = f"{session_id}:{f['path']}"
            if rev_key not in self._revisions or force_reset:
                self._revisions[rev_key] = 1
        return session_dir

    def get_revision(self, session_id: str, relative_path: str) -> int:
        """Return the authoritative revision number for a file."""
        clean_rel = relative_path.replace("\\", "/").strip().lstrip("/")
        rev_key = f"{session_id}:{clean_rel}"
        return self._revisions.get(rev_key, 1)

    def get_all_revisions(self, session_id: str) -> dict[str, int]:
        """Return all tracked file revisions for a session."""
        prefix = f"{session_id}:"
        return {
            k[len(prefix):]: v
            for k, v in self._revisions.items()
            if k.startswith(prefix)
        }

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
        if self.is_session_submitted(session_id):
            raise WorkspaceSecurityError(
                f"Session '{session_id}' has already been submitted and is locked in read-only mode. Workspace modifications are prohibited."
            )

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
        base_revision: int | None = None,
        expected_old_content: str | None = None,
    ) -> dict[str, Any]:
        """Atomically edit a file in the workspace and produce a unified diff."""
        if self.is_session_submitted(session_id):
            raise WorkspaceSecurityError(
                f"Session '{session_id}' has already been submitted and is locked in read-only mode. Workspace modifications are prohibited."
            )

        target = self.resolve_safe_path(session_id, relative_path)
        session_dir = self.get_session_dir(session_id)
        clean_rel = target.relative_to(session_dir).as_posix()
        rev_key = f"{session_id}:{clean_rel}"
        current_rev = self._revisions.get(rev_key, 1)

        old_content = ""
        if target.exists():
            old_content = target.read_text(encoding="utf-8", errors="replace")

        # Optimistic concurrency control: reject updates with stale base_revision
        if base_revision is not None and base_revision < current_rev:
            raise RevisionConflictError(
                path=clean_rel,
                expected_revision=base_revision,
                current_revision=current_rev,
                current_content=old_content,
            )

        if expected_old_content is not None and old_content and expected_old_content.strip() not in old_content:
            raise ValueError(
                f"Edit conflict: target content in '{relative_path}' does not match expected state."
            )

        target.parent.mkdir(parents=True, exist_ok=True)

        # Generate unified diff
        diff_lines = list(
            difflib.unified_diff(
                old_content.splitlines(keepends=True),
                new_content.splitlines(keepends=True),
                fromfile=f"a/{clean_rel}",
                tofile=f"b/{clean_rel}",
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

        # Increment authoritative revision
        next_rev = current_rev + 1
        self._revisions[rev_key] = next_rev

        return {
            "path": clean_rel,
            "revision": next_rev,
            "diff": diff_text,
            "lines_changed": len([l for l in diff_lines if l.startswith(("+", "-")) and not l.startswith(("+++", "---"))]),
        }
