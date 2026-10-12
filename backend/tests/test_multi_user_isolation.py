import json
import sqlite3
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


class TestMultiUserIsolation(unittest.TestCase):
    user_a_id: int | None = None
    user_a_token: str = ""
    user_b_id: int | None = None
    user_b_token: str = ""
    valid_exercise_id: int = 1

    @classmethod
    def setUpClass(cls):
        ts = int(time.time() * 1000)
        user_a_name = f"user_iso_a_{ts}"
        user_b_name = f"user_iso_b_{ts}"
        pwd = "Password123!"

        # Fetch exercise
        status, exercises = make_request("GET", "/exercises")
        if status == 200 and isinstance(exercises, list) and len(exercises) > 0:
            cls.valid_exercise_id = exercises[0]["id"]

        # Register User A
        reg_a = {
            "username": user_a_name,
            "password": pwd,
            "email": f"{user_a_name}@iso.test",
        }
        st_a, res_a = make_request("POST", "/auth/register", reg_a)
        assert st_a == 200, f"Failed registering User A: {res_a}"
        cls.user_a_id = res_a["user"]["id"]
        cls.user_a_token = res_a["access_token"]

        # Register User B
        reg_b = {
            "username": user_b_name,
            "password": pwd,
            "email": f"{user_b_name}@iso.test",
        }
        st_b, res_b = make_request("POST", "/auth/register", reg_b)
        assert st_b == 200, f"Failed registering User B: {res_b}"
        cls.user_b_id = res_b["user"]["id"]
        cls.user_b_token = res_b["access_token"]

    @classmethod
    def tearDownClass(cls):
        # Clean up created test users from SQLite database
        if DB_PATH.exists():
            try:
                conn = sqlite3.connect(str(DB_PATH))
                cur = conn.cursor()
                user_ids = [uid for uid in [cls.user_a_id, cls.user_b_id] if uid is not None]
                if user_ids:
                    placeholders = ",".join("?" * len(user_ids))
                    cur.execute(
                        f"""
                        DELETE FROM workout_sets
                        WHERE workout_session_id IN (
                            SELECT id FROM workout_sessions WHERE user_id IN ({placeholders})
                        )
                    """,
                        user_ids,
                    )
                    cur.execute(f"DELETE FROM workout_sessions WHERE user_id IN ({placeholders})", user_ids)
                    cur.execute(f"DELETE FROM users WHERE id IN ({placeholders})", user_ids)
                    conn.commit()
                conn.close()
            except Exception as e:
                print("Error tearing down test users:", e)

    def test_01_active_workout_isolation(self):
        """User A starts a session. User B must NOT see it in /workouts/active or /workouts/current."""
        # 1. User A starts workout
        start_payload = {
            "sport_type": "strength",
            "notes": "User A Private Session",
        }
        status, sess_a = make_request("POST", "/workouts/start", start_payload, token=self.user_a_token)
        self.assertEqual(status, 200, f"User A start failed: {sess_a}")
        self.assertEqual(sess_a["user_id"], self.user_a_id)
        user_a_session_id = sess_a["id"]

        # 2. User B queries active session
        st_b_active, res_b_active = make_request("GET", "/workouts/active", token=self.user_b_token)
        self.assertEqual(st_b_active, 200)
        self.assertIsNone(res_b_active, "User B should NOT have any active session, but got one!")

        st_b_current, res_b_current = make_request("GET", "/workouts/current", token=self.user_b_token)
        self.assertEqual(st_b_current, 200)
        self.assertIsNone(res_b_current, "User B should NOT see User A's session in /workouts/current")

        # 3. User B tries to inject a set sending User A's session_id to POST /workouts/sets
        malicious_payload = {
            "session_id": user_a_session_id,
            "exercise_id": self.valid_exercise_id,
            "set_number": 1,
            "weight": 100.0,
            "reps": 10,
            "completed": True,
        }
        st_set, res_set = make_request("POST", "/workouts/sets", malicious_payload, token=self.user_b_token)
        self.assertEqual(st_set, 200, f"User B set post failed: {res_set}")
        # The set must NOT be associated with User A's session
        self.assertNotEqual(
            res_set["workout_session_id"],
            user_a_session_id,
            "LEAK DETECTED: User B set was assigned to User A's session!",
        )

        # 4. User A checks their active workout; User B's set must NOT be present
        st_check_a, res_check_a = make_request("GET", "/workouts/active", token=self.user_a_token)
        self.assertEqual(st_check_a, 200)
        self.assertEqual(len(res_check_a.get("sets", [])), 0, "User A session contains leaked sets from User B!")

        # 5. User B tries to inject a set to POST /workouts/{user_a_session_id}/sets
        st_set2, res_set2 = make_request(
            "POST",
            f"/workouts/{user_a_session_id}/sets",
            malicious_payload,
            token=self.user_b_token,
        )
        self.assertEqual(st_set2, 200, f"User B set 2 post failed: {res_set2}")
        self.assertNotEqual(
            res_set2["workout_session_id"],
            user_a_session_id,
            "LEAK DETECTED: User B set via path parameter was assigned to User A's session!",
        )

    def test_02_history_and_metrics_isolation(self):
        """History, records and metrics must be completely isolated between User A and User B."""
        # User A saves a completed workout with 1 set
        save_payload = {
            "sport_type": "strength",
            "sets": [
                {
                    "exercise_id": self.valid_exercise_id,
                    "set_number": 1,
                    "weight": 120.0,
                    "reps": 5,
                    "completed": True,
                }
            ],
            "notes": "User A Finished Workout",
        }
        st_save, res_save = make_request("POST", "/workouts", save_payload, token=self.user_a_token)
        self.assertEqual(st_save, 200, f"User A save workout failed: {res_save}")

        # User B queries history
        st_hist_b, hist_b = make_request("GET", "/workouts/history", token=self.user_b_token)
        self.assertEqual(st_hist_b, 200)
        for w in hist_b:
            self.assertEqual(w["user_id"], self.user_b_id, "User B history contains workouts from another user!")

        # User B queries records
        st_rec_b, rec_b = make_request("GET", "/records", token=self.user_b_token)
        self.assertEqual(st_rec_b, 200)
        # Check that none of User B's records show 120 kg (which only User A lifted)
        for r in rec_b:
            self.assertNotEqual(r.get("max_weight"), 120.0, "User B shows record from User A!")

        # User B queries metrics summary
        st_met_b, met_b = make_request("GET", "/metrics", token=self.user_b_token)
        self.assertEqual(st_met_b, 200)
        self.assertEqual(met_b.get("user_id"), self.user_b_id)


if __name__ == "__main__":
    unittest.main()
