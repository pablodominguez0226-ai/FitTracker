import json
import sqlite3
import sys
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

BASE_URL = "http://localhost:80/api"
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DB_PATH = DATA_DIR / "fittracker.db"


def make_request(method: str, path: str, payload: dict | None = None, token: str | None = None) -> tuple[int, dict]:
    url = f"{BASE_URL}{path}"
    data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data_bytes, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            parsed = json.loads(body) if body else {}
            return resp.status, parsed
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return e.code, parsed


class TestWorkoutSaveAndTeardown(unittest.TestCase):
    test_user_id: int | None = None
    test_username: str = ""
    auth_token: str = ""
    valid_exercise_id: int = 84

    @classmethod
    def setUpClass(cls):
        # 1. Ensure test user name is unique
        cls.test_username = f"testdiag_{int(time.time())}"
        test_password = "Password123!"

        # 2. Get an existing exercise ID from database or API
        status, exercises = make_request("GET", "/exercises")
        if status == 200 and isinstance(exercises, list) and len(exercises) > 0:
            cls.valid_exercise_id = exercises[0]["id"]

        # 3. Register temporary test user
        register_payload = {
            "username": cls.test_username,
            "password": test_password,
            "email": f"{cls.test_username}@testfittracker.local",
        }
        status, resp = make_request("POST", "/auth/register", register_payload)
        if status not in (200, 201):
            # Fallback to login if already exists
            status, resp = make_request("POST", "/auth/login", {"username": cls.test_username, "password": test_password})

        assert status in (200, 201), f"Failed to register test user: {status} - {resp}"
        cls.auth_token = resp["access_token"]
        cls.test_user_id = resp["user"]["id"]
        print(f"\n[SETUP] Test user created: ID={cls.test_user_id}, Username={cls.test_username}")

    @classmethod
    def tearDownClass(cls):
        # OBLIGATORY TEARDOWN: Completely wipe any test user and session records created
        if not cls.test_user_id:
            return

        print(f"\n[TEARDOWN] Starting mandatory database cleanup for test user ID={cls.test_user_id}...")
        try:
            conn = sqlite3.connect(str(DB_PATH), timeout=10)
            cur = conn.cursor()

            # Find all sessions belonging to test user
            cur.execute("SELECT id FROM workout_sessions WHERE user_id = ?", (cls.test_user_id,))
            session_ids = [row[0] for row in cur.fetchall()]

            # Delete workout sets
            if session_ids:
                placeholders = ",".join("?" for _ in session_ids)
                cur.execute(f"DELETE FROM workout_sets WHERE workout_session_id IN ({placeholders})", session_ids)

            # Delete workout sessions
            cur.execute("DELETE FROM workout_sessions WHERE user_id = ?", (cls.test_user_id,))

            # Delete related tables if any
            cur.execute("DELETE FROM support_requests WHERE user_id = ?", (cls.test_user_id,))
            cur.execute("DELETE FROM battle_participants WHERE user_id = ?", (cls.test_user_id,))

            # Delete user
            cur.execute("DELETE FROM users WHERE id = ?", (cls.test_user_id,))
            conn.commit()

            # Verify deletion
            cur.execute("SELECT COUNT(*) FROM users WHERE id = ?", (cls.test_user_id,))
            user_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM workout_sessions WHERE user_id = ?", (cls.test_user_id,))
            sess_count = cur.fetchone()[0]
            conn.close()

            assert user_count == 0, f"Teardown error: User ID {cls.test_user_id} still exists in database!"
            assert sess_count == 0, f"Teardown error: Sessions for user ID {cls.test_user_id} still exist!"
            print(f"[TEARDOWN] Successfully wiped all test records. Database is completely clean.")
        except Exception as e:
            print(f"[TEARDOWN ERROR] Exception during cleanup: {e}", file=sys.stderr)
            raise

    def test_01_save_consolidated_workout_session_success(self):
        """Verify saving a workout session via POST /api/workouts/session returns 200 (not 500) and computes records."""
        payload = {
            "date": time.strftime("%Y-%m-%d"),
            "muscle_group_id": 1,
            "sport_type": "strength",
            "notes": "Automated verification workout",
            "sets": [
                {
                    "exercise_id": self.valid_exercise_id,
                    "set_number": 1,
                    "weight": 55.0,
                    "reps": 10,
                    "completed": True,
                    "rir": 2,
                    "set_type": "normal",
                },
                {
                    "exercise_id": self.valid_exercise_id,
                    "set_number": 2,
                    "weight": 60.0,
                    "reps": 8,
                    "completed": True,
                    "rir": 1,
                    "set_type": "normal",
                },
            ],
        }
        status, data = make_request("POST", "/workouts/session", payload, token=self.auth_token)

        self.assertIn(status, (200, 201), f"Expected 200/201 but got {status}. Response: {data}")
        self.assertEqual(data.get("status"), "completed")
        self.assertEqual(len(data.get("sets", [])), 2)
        self.assertIn("records", data)
        self.assertIsInstance(data["records"], list)
        self.assertGreaterEqual(len(data["records"]), 1)
        # Check computed PR
        pr_record = next((r for r in data["records"] if r["exercise_id"] == self.valid_exercise_id), None)
        self.assertIsNotNone(pr_record)
        self.assertEqual(pr_record["pr_weight"], 60.0)
        self.assertEqual(pr_record["pr_reps"], 8)
        print(" [PASS] test_01_save_consolidated_workout_session_success: HTTP 200, PR calculated without 500 error")

    def test_02_start_add_set_and_finish_workout_success(self):
        """Verify starting an active workout, adding a set, and finishing it via POST /api/workouts/{id}/finish."""
        # 1. Start session
        start_payload = {
            "muscle_group_id": 1,
            "sport_type": "strength",
            "notes": "Testing active flow",
        }
        status, start_data = make_request("POST", "/workouts/start", start_payload, token=self.auth_token)
        self.assertIn(status, (200, 201), f"Failed to start workout: {status} - {start_data}")
        workout_id = start_data["id"]
        self.assertEqual(start_data.get("status"), "in_progress")

        # 2. Add set
        set_payload = {
            "exercise_id": self.valid_exercise_id,
            "set_number": 1,
            "weight": 65.0,
            "reps": 6,
            "completed": True,
            "rir": 1,
            "set_type": "normal",
        }
        status, set_data = make_request("POST", f"/workouts/{workout_id}/sets", set_payload, token=self.auth_token)
        self.assertIn(status, (200, 201), f"Failed to add set: {status} - {set_data}")

        # 3. Finish session (previously caused HTTP 500 error!)
        finish_payload = {
            "sport_type": "strength",
            "notes": "Finished active test workout",
        }
        status, finish_data = make_request("POST", f"/workouts/{workout_id}/finish", finish_payload, token=self.auth_token)
        self.assertIn(status, (200, 201), f"Expected 200/201 on finish_workout, got {status}. Response: {finish_data}")
        self.assertEqual(finish_data.get("status"), "completed")
        self.assertIn("records", finish_data)
        self.assertIsInstance(finish_data["records"], list)
        print(" [PASS] test_02_start_add_set_and_finish_workout_success: HTTP 200, session finished and PR updated without 500 error")

    def test_03_invalid_exercise_returns_404_not_500(self):
        """Verify that passing an invalid/non-existent exercise ID returns 404 (or 400/422) and NOT an unhandled 500."""
        invalid_payload = {
            "date": time.strftime("%Y-%m-%d"),
            "muscle_group_id": 1,
            "sport_type": "strength",
            "sets": [
                {
                    "exercise_id": 99999999,
                    "set_number": 1,
                    "weight": 50.0,
                    "reps": 10,
                    "completed": True,
                }
            ],
        }
        status, data = make_request("POST", "/workouts/session", invalid_payload, token=self.auth_token)
        self.assertIn(status, (400, 404, 422), f"Expected client error code 400/404/422, got {status}. Response: {data}")
        self.assertNotEqual(status, 500, "Server must not return 500 on non-existent exercise ID!")
        self.assertIn("detail", data)
        print(f" [PASS] test_03_invalid_exercise_returns_404_not_500: HTTP {status} with descriptive detail: {data.get('detail')}")

    def test_04_empty_sets_in_strength_returns_400_not_500(self):
        """Verify that attempting to save a strength workout with 0 sets returns 400 with a descriptive message."""
        empty_payload = {
            "date": time.strftime("%Y-%m-%d"),
            "muscle_group_id": 1,
            "sport_type": "strength",
            "sets": [],
        }
        status, data = make_request("POST", "/workouts/session", empty_payload, token=self.auth_token)
        self.assertEqual(status, 400, f"Expected 400 Bad Request, got {status}. Response: {data}")
        self.assertIn("detail", data)
        print(f" [PASS] test_04_empty_sets_in_strength_returns_400_not_500: HTTP 400 with detail: {data.get('detail')}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
