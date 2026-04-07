import os
import time
import requests
import string
import random
import json

BASE_URL = "http://127.0.0.1:8000"

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def generate_fake_email():
    return f"fake_{generate_random_string(6)}@example.com"

def get_admin_token():
    admin_email = os.getenv("ADMIN_EMAIL", "NiT@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "NiT@2026")
    print(f"[*] Attempting Admin Login with {admin_email}...")
    
    login_payload = {"email": admin_email, "password": admin_password}
    start = time.time()
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    latency = (time.time() - start) * 1000
    
    if resp.status_code == 200:
        print(f"  [+] Logged in successfully. Latency: {latency:.2f} ms")
        return resp.json().get("access_token")
    else:
        print(f"  [-] Login failed (status {resp.status_code}): {resp.text}")
        print("      Cannot load Admin Token. Check Environment credentials.")
        return None

def test_public_registration():
    print(f"\n[*] Testing Public Registration Endpoint...")
    email = generate_fake_email()
    phone = "09" + str(random.randint(10000000, 99999999))
    payload = {
        "username": f"Test User {generate_random_string(4)}",
        "email": email,
        "date_of_birth": "2000-01-01",
        "phone": phone,
        "department": "College"
    }
    
    start = time.time()
    resp = requests.post(f"{BASE_URL}/auth/register", json=payload)
    latency = (time.time() - start) * 1000
    
    if resp.status_code in [200, 201]:
        print(f"  [+] /auth/register Response ({resp.status_code}): {latency:.2f} ms")
    else:
        print(f"  [-] Registration Failed ({resp.status_code}): {latency:.2f} ms -> {resp.text}")
        
    return email, phone

def test_admin_endpoints(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints_to_test = [
        ("GET", "/admin/users", None),
        ("GET", "/admin/students", None),
        ("GET", "/admin/teachers", None),
        ("GET", "/admin/parents", None),
        ("GET", "/admin/activity-logs", None),
        ("GET", "/admin/rooms", None),
        ("GET", "/admin/timetables", None),
        ("GET", "/admin/academic-years", None),
        ("GET", "/admin/courses", None),
        ("GET", "/admin/enrollments", None),
        ("GET", "/admin/payments", None),
    ]
    
    print("\n[*] Testing Protected Admin Retrieval Endpoints (Measuring GET Delays)...")
    for method, path, json_data in endpoints_to_test:
        url = f"{BASE_URL}{path}"
        start = time.time()
        resp = requests.request(method, url, headers=headers, json=json_data)
        latency = (time.time() - start) * 1000
        
        status = resp.status_code
        if status == 200:
            print(f"  [+] {method} {path:<20} -> Status {status} | Delay: {latency:.2f} ms")
        else:
            print(f"  [-] {method} {path:<20} -> Status {status} | Delay: {latency:.2f} ms")
            print(f"      Error Details: {resp.text}")
            
    print("\n[*] Adding Fake Data via Protected Post Endpoints...")
    staff_payload = {
        "username": f"Fake Teacher {generate_random_string(3)}",
        "email": generate_fake_email(),
        "password": "password123",
        "date_of_birth": "1990-05-15",
        "role": "teacher",
        "is_active": True
    }
    start = time.time()
    staff_resp = requests.post(f"{BASE_URL}/admin/staff", headers=headers, json=staff_payload)
    latency = (time.time() - start) * 1000
    if staff_resp.status_code in [200, 201]:
        print(f"  [+] POST /admin/staff -> Created Successfully! | Delay: {latency:.2f} ms")
    else:
        print(f"  [-] POST /admin/staff -> Failed {staff_resp.status_code} | Delay: {latency:.2f} ms")
        print(f"      {staff_resp.text}")


if __name__ == "__main__":
    print("=========================================================")
    print("      API DELAY & LATENCY TESTING SCRIPT (WITH FAKE DATA)")
    print("=========================================================")
    
    # Check if DB backend is responding
    try:
        r = requests.get(f"{BASE_URL}/", timeout=2)
        print(f"  [Server Ping] -> Success ({r.status_code})")
    except Exception as e:
        print("  [Server Ping] -> Failed! Make sure Uvicorn is running on port 8000.")
        exit(1)
    
    # 1. Public Post Route Testing
    test_public_registration()
    
    # 2. Get Admin Authentication Configuration
    token = get_admin_token()
    if token:
        test_admin_endpoints(token)
    else:
        print("\nSkipping protected endpoints measuring. Provide Admin ENV Vars.")
        
    print("\n=========================================================")
    print("Tests Completed.")
