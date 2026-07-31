FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Expose port
EXPOSE 8000

# Production environment settings
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Start with Gunicorn + UvicornWorker for production multi-worker support.
# - WORKER_CONCURRENCY controls the number of worker processes (default 4).
# - Railway injects PORT automatically.
# - gunicorn.conf.py provides the full configuration.
CMD gunicorn app.app:app \
    -c gunicorn.conf.py \
    --bind 0.0.0.0:${PORT:-8000}
