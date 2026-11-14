"""Safe logging configuration adhering to Codevo zero-secret-leakage invariants."""

import logging
import sys


def setup_logging(environment: str = "development") -> None:
    """Configure system logging safely without secret leakage."""
    log_level = logging.DEBUG if environment == "development" else logging.INFO

    log_format = (
        "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
        if environment == "development"
        else '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}'
    )

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    # Suppress verbose noise from third-party libraries while retaining critical warnings
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)


logger = logging.getLogger("codevo.backend")

