FROM python:3.11-slim

# Prevent python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir \
    pytest==8.3.3 \
    fastapi==0.115.0 \
    pydantic==2.9.2 \
    email-validator==2.2.0 \
    httpx==0.27.2 \
    argon2-cffi==25.1.0

# Create non-root runner user
RUN useradd -m -u 1000 runner
USER runner

WORKDIR /workspace
CMD ["pytest", "-v"]

