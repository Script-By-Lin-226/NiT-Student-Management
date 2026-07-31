"""
Locust Load Test Suite — NiT Student Management API
=====================================================
Run with:
    locust -f tests/load_tests/locustfile.py --host=http://localhost:8000

Web UI:  http://localhost:8089
Headless (CI):
    locust -f tests/load_tests/locustfile.py --host=http://localhost:8000 \
           --users 50 --spawn-rate 5 --run-time 60s --headless

Scenarios:
- AuthenticatedUser: login → dashboard → students → teachers
- BulkAttendanceUser: login → mark attendance
- SearchUser:        login → search/filter students
"""
import random
import string
from locust import HttpUser, task, between, events


def random_string(length=8):
    return "".join(random.choices(string.ascii_lowercase, k=length))


class AuthenticatedUser(HttpUser):
    """Simulates a logged-in admin user browsing the dashboard and lists."""
    wait_time = between(1, 3)

    def on_start(self):
        """Login and store session cookies."""
        resp = self.client.post(
            "/auth/login",
            json={"email": "admin@nit.com", "password": "Admin@123"},
            name="/auth/login",
        )
        if resp.status_code != 200:
            self.environment.runner.quit()

    @task(5)
    def dashboard_summary(self):
        """High-frequency: dashboard is loaded on every admin login."""
        self.client.get("/admin/dashboard/summary", name="GET /admin/dashboard/summary")

    @task(4)
    def list_students(self):
        page = random.randint(1, 3)
        self.client.get(
            f"/admin/students?page={page}&limit=50",
            name="GET /admin/students",
        )

    @task(3)
    def list_courses(self):
        self.client.get("/admin/courses?page=1&limit=50", name="GET /admin/courses")

    @task(3)
    def list_enrollments(self):
        self.client.get("/admin/enrollments?page=1&limit=50", name="GET /admin/enrollments")

    @task(2)
    def list_teachers(self):
        self.client.get("/admin/teachers?page=1&limit=50", name="GET /admin/teachers")

    @task(2)
    def academic_years(self):
        self.client.get("/admin/academic-years", name="GET /admin/academic-years")

    @task(1)
    def get_me(self):
        self.client.get("/auth/me", name="GET /auth/me")

    @task(1)
    def activity_logs(self):
        self.client.get("/admin/activity-logs?page=1&limit=20", name="GET /admin/activity-logs")


class StaffUser(HttpUser):
    """Simulates a teacher/staff member accessing their portal."""
    wait_time = between(2, 5)
    weight = 3  # Less frequent than admin

    def on_start(self):
        resp = self.client.post(
            "/auth/login",
            json={"email": "teacher@nit.com", "password": "Teacher@123"},
            name="/auth/login [teacher]",
        )
        if resp.status_code not in (200, 401):
            # Tolerate login failure if test teacher doesn't exist
            pass

    @task(3)
    def get_me(self):
        self.client.get("/auth/me", name="GET /auth/me [staff]")

    @task(2)
    def list_batches(self):
        self.client.get("/admin/batches", name="GET /admin/batches [staff]")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("=" * 60)
    print("NiT API Load Test Starting")
    print(f"Target: {environment.host}")
    print("=" * 60)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("=" * 60)
    print("Load Test Complete")
    stats = environment.runner.stats.total
    print(f"Total Requests:  {stats.num_requests}")
    print(f"Failures:        {stats.num_failures}")
    print(f"Avg Latency:     {stats.avg_response_time:.1f}ms")
    print(f"95th Percentile: {stats.get_response_time_percentile(0.95):.1f}ms")
    print(f"99th Percentile: {stats.get_response_time_percentile(0.99):.1f}ms")
    print("=" * 60)
