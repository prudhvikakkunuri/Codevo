"""Isolated test runner supporting Docker container isolation with fallback to sandboxed subprocess."""

import asyncio
import logging
import re
import shutil
import time
from pathlib import Path
from pydantic import BaseModel

logger = logging.getLogger("codevo.runner")


class TestRunResult(BaseModel):
    exit_code: int
    passed: bool
    stdout: str
    stderr: str
    duration_seconds: float
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    runner_type: str  # "docker" or "subprocess"


class IsolatedTestRunner:
    """Executes pytest suites inside isolated boundaries."""

    def __init__(
        self,
        docker_image: str = "codevo-runner:3.11",
        timeout_seconds: float = 30.0,
        memory_limit: str = "512m",
        cpu_limit: str = "1.0",
    ) -> None:
        self.docker_image = docker_image
        self.timeout_seconds = timeout_seconds
        self.memory_limit = memory_limit
        self.cpu_limit = cpu_limit

    def _parse_pytest_summary(self, output: str) -> tuple[int, int, int]:
        """Extract total, passed, and failed test counts from pytest stdout."""
        passed = 0
        failed = 0

        # Look for e.g. "5 passed, 1 failed in 0.23s" or "6 passed in 0.15s"
        match_passed = re.search(r"(\d+)\s+passed", output)
        if match_passed:
            passed = int(match_passed.group(1))

        match_failed = re.search(r"(\d+)\s+failed", output)
        if match_failed:
            failed = int(match_failed.group(1))

        match_errors = re.search(r"(\d+)\s+error", output)
        if match_errors:
            failed += int(match_errors.group(1))

        total = passed + failed
        return total, passed, failed

    async def run_tests(
        self,
        workspace_dir: Path,
        trusted_tests_dir: Path,
        prefer_docker: bool = True,
        allow_unsafe_fallback: bool = False,
    ) -> TestRunResult:
        """Run pytest on the candidate workspace against trusted tests.

        Enforces container isolation by default. Unsafe host execution fallback
        is strictly disabled unless allow_unsafe_fallback=True is explicitly set.
        """
        workspace_dir = Path(workspace_dir).resolve()
        trusted_tests_dir = Path(trusted_tests_dir).resolve()

        if prefer_docker:
            if shutil.which("docker"):
                try:
                    return await self._run_in_docker(workspace_dir, trusted_tests_dir)
                except Exception as exc:
                    logger.warning("Docker execution failed: %s", exc)
                    if not allow_unsafe_fallback:
                        return TestRunResult(
                            exit_code=-1,
                            passed=False,
                            stdout="",
                            stderr=f"Docker container execution failed: {exc}. Unsafe host execution fallback is disabled by security policy.",
                            duration_seconds=0.0,
                            runner_type="docker_unavailable",
                        )
            else:
                if not allow_unsafe_fallback:
                    return TestRunResult(
                        exit_code=-1,
                        passed=False,
                        stdout="",
                        stderr="Docker execution boundary unavailable: 'docker' CLI not found. Unsafe host execution fallback is disabled by security policy.",
                        duration_seconds=0.0,
                        runner_type="docker_unavailable",
                    )

        if allow_unsafe_fallback:
            return await self._run_in_subprocess(workspace_dir, trusted_tests_dir)

        return TestRunResult(
            exit_code=-1,
            passed=False,
            stdout="",
            stderr="Test execution refused: Docker container isolation is required and unsafe fallback is disabled.",
            duration_seconds=0.0,
            runner_type="docker_unavailable",
        )

    async def _run_in_docker(self, workspace_dir: Path, trusted_tests_dir: Path) -> TestRunResult:
        """Execute tests in an isolated non-root Docker container with network egress disabled."""
        start_time = time.time()

        # Convert Windows paths to forward slashes for Docker volume mounts
        ws_mount = str(workspace_dir).replace("\\", "/")
        tests_mount = str(trusted_tests_dir).replace("\\", "/")

        cmd = [
            "docker",
            "run",
            "--rm",
            "--network",
            "none",
            "--memory",
            self.memory_limit,
            "--cpus",
            self.cpu_limit,
            "--user",
            "1000:1000",
            "--security-opt",
            "no-new-privileges:true",
            "--read-only",
            "--tmpfs",
            "/tmp:rw,noexec,nosuid,size=64m",
            "-e",
            "PYTHONPATH=/workspace",
            "-v",
            f"{ws_mount}:/workspace:rw",
            "-v",
            f"{tests_mount}:/trusted_tests:ro",
            "-w",
            "/workspace",
            self.docker_image,
            "pytest",
            "-v",
            "-o",
            "cache_dir=/workspace/.pytest_cache",
            "--import-mode=importlib",
            "/trusted_tests",
        ]

        logger.info("Executing Docker test runner: %s", " ".join(cmd))
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            duration = time.time() - start_time
            return TestRunResult(
                exit_code=-1,
                passed=False,
                stdout="",
                stderr=f"Test execution timed out after {self.timeout_seconds:.1f}s.",
                duration_seconds=duration,
                runner_type="docker",
            )

        duration = time.time() - start_time
        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")
        exit_code = proc.returncode or 0

        total, passed_cnt, failed_cnt = self._parse_pytest_summary(stdout)

        return TestRunResult(
            exit_code=exit_code,
            passed=(exit_code == 0),
            stdout=stdout,
            stderr=stderr,
            duration_seconds=duration,
            total_tests=total,
            passed_tests=passed_cnt,
            failed_tests=failed_cnt,
            runner_type="docker",
        )

    async def _run_in_subprocess(self, workspace_dir: Path, trusted_tests_dir: Path) -> TestRunResult:
        """Fallback execution in restricted subprocess with stripped environment (no host secrets)."""
        start_time = time.time()

        # Locate pytest in backend virtualenv
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent
        pytest_exe = backend_dir / ".venv" / "Scripts" / "pytest.exe"
        if not pytest_exe.exists():
            pytest_exe = Path("pytest")

        cmd = [
            str(pytest_exe),
            "-v",
            "-o",
            f"pythonpath={workspace_dir}",
            "-o",
            f"cache_dir={workspace_dir / '.pytest_cache'}",
            str(trusted_tests_dir),
        ]

        # Stripped environment containing zero host secrets or credentials
        import os
        safe_env = {
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", "C:\\Windows"),
            "PATH": os.environ.get("PATH", ""),
            "PYTHONPATH": str(workspace_dir),
            "PYTHONDONTWRITEBYTECODE": "1",
        }

        logger.info("Executing subprocess test runner in %s", workspace_dir)
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(workspace_dir),
            env=safe_env,
        )

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(),
                timeout=self.timeout_seconds,
            )
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            duration = time.time() - start_time
            return TestRunResult(
                exit_code=-1,
                passed=False,
                stdout="",
                stderr=f"Test execution timed out after {self.timeout_seconds:.1f}s.",
                duration_seconds=duration,
                runner_type="subprocess",
            )

        duration = time.time() - start_time
        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")
        exit_code = proc.returncode or 0

        total, passed_cnt, failed_cnt = self._parse_pytest_summary(stdout)

        return TestRunResult(
            exit_code=exit_code,
            passed=(exit_code == 0),
            stdout=stdout,
            stderr=stderr,
            duration_seconds=duration,
            total_tests=total,
            passed_tests=passed_cnt,
            failed_tests=failed_cnt,
            runner_type="subprocess",
        )
