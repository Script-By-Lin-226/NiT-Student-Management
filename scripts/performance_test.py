import requests
import time
import json

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_TOKEN = "YOUR_JWT_TOKEN" # Replace with valid admin token

def test_pagination(page=1, limit=10):
    start = time.time()
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    try:
        r = requests.get(f"{BASE_URL}/admin/activity-logs", params={"page": page, "limit": limit}, headers=headers)
        r.raise_for_status()
        data = r.json()
        end = time.time()
        
        print(f"--- Fetching Activity Logs (Page {page}, Limit {limit}) ---")
        print(f"Status Code: {r.status_code}")
        print(f"Duration: {end - start:.4f}s")
        print(f"Data count: {len(data.get('data', []))}")
        print(f"Total entries in DB: {data.get('pagination', {}).get('total', 'unknown')}")
        print(f"Total pages: {data.get('pagination', {}).get('total_pages', 'unknown')}")
        print("-" * 50)
    except Exception as e:
        print(f"Error test_pagination: {e}")

if __name__ == "__main__":
    print("NiT-ERP Performance Verification Suite")
    print("=" * 50)
    # Note: Requires a running server and valid token.
    test_pagination(1, 10)
    test_pagination(2, 50)
