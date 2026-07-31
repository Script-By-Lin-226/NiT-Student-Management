"""
Gunicorn Production Configuration
===================================
Used when starting with: gunicorn app.app:app -c gunicorn.conf.py

Railway injects PORT env var — handled in the Dockerfile CMD.
Worker count is controlled via WORKER_CONCURRENCY env var (default 4).
"""
import os
import multiprocessing

# Worker configuration
# Formula: 2 * CPU cores + 1 is a common starting point for I/O-bound apps.
# Override via WORKER_CONCURRENCY env var in Railway settings.
workers = int(os.getenv("WORKER_CONCURRENCY", min(2 * multiprocessing.cpu_count() + 1, 4)))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000

# Timeouts — generous for Railway cross-region DB latency
timeout = 120           # Worker timeout in seconds
keepalive = 5           # Seconds to wait for requests on Keep-Alive connections
graceful_timeout = 30   # Time to finish in-flight requests on shutdown

# Binding — Railway provides PORT, default 8000
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"

# Logging
loglevel = os.getenv("LOG_LEVEL", "info").lower()
accesslog = "-"   # stdout
errorlog = "-"    # stderr
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)sµs'

# Process naming
proc_name = "nit-api"

# Preload app — loads application before forking workers (faster startup, saves memory)
preload_app = True
