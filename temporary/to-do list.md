# Optimization & Uptime To-Do List

1. [x] Implement `/health` endpoint in `backend/app/app.py`.
2. [x] Add a self-pinging background task in `backend/app/services/uptime_service.py`.
3. [x] Integrated `keep_alive_task` into application startup life cycle.
4. [x] Add a GitHub Actions workflow `.github/workflows/keep_alive.yml` for external pinging.
5. [ ] Verify `RENDER_EXTERNAL_URL` value from the USER for accurate setup.
