FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# libpq-dev and gcc are needed for building psycopg2 if needed
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

# Set environment variables for production
ENV PYTHONUNBUFFERED=1

# Command to start the application (init_db creates tables on startup)
CMD sh -c "uvicorn app.app:app --host 0.0.0.0 --port ${PORT:-8000}"
