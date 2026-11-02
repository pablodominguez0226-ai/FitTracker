import json
import unittest
import urllib.error
import urllib.request

BASE_URL = "http://localhost:80/api"


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
            parsed = {"detail": body}
        return e.code, parsed


class TestWeeklyPatternAndHistory(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.username = f"testuser_{int(urllib.request.time.time())}"
        cls.password = "Secr3tP@ssw0rd!"
        status, resp = make_request("POST", "/auth/register", {
            "username": cls.username,
            "password": cls.password,
        })
        assert status == 200, f"Registration failed: {resp}"
        cls.token = resp["access_token"]
        cls.user_id = resp["user"]["id"]

    @classmethod
    def tearDownClass(cls):
        # Clean up test user's sessions
        status, sessions = make_request("GET", "/workouts/history", token=cls.token)
        if status == 200 and isinstance(sessions, list):
            for s in sessions:
                make_request("DELETE", f"/workouts/{s['id']}", token=cls.token)

    def test_01_weekly_pattern_get_and_put(self):
        # 1. Get default weekly pattern
        status, pattern = make_request("GET", "/profile/weekly-pattern", token=self.token)
        self.assertEqual(status, 200)
        self.assertEqual(pattern.get("lunes"), "entreno")
        self.assertEqual(pattern.get("sabado"), "descanso")

        # 2. Update weekly pattern
        custom_pattern = {
            "lunes": "entreno",
            "martes": "entreno",
            "miercoles": "flexible",
            "jueves": "entreno",
            "viernes": "entreno",
            "sabado": "descanso",
            "domingo": "descanso",
        }
        status, updated = make_request("PUT", "/profile/weekly-pattern", custom_pattern, token=self.token)
        self.assertEqual(status, 200)
        self.assertEqual(updated["miercoles"], "flexible")

        # Verify profile out reflects weekly pattern
        status, prof = make_request("GET", "/auth/profile", token=self.token)
        self.assertEqual(status, 200)
        self.assertIn("weekly_pattern", prof)
        self.assertEqual(prof["weekly_pattern"]["miercoles"], "flexible")

    def test_02_create_session_list_history_and_delete(self):
        # 1. Create a workout session
        start_payload = {
            "date": "2026-10-14",
            "muscle_group_id": 1,
            "sport_type": "strength",
        }
        status, session = make_request("POST", "/workouts/start", start_payload, token=self.token)
        self.assertEqual(status, 200)
        session_id = session["id"]

        # Add a set
        set_payload = {
            "workout_session_id": session_id,
            "exercise_id": 1,
            "set_number": 1,
            "weight": 80.0,
            "reps": 10,
            "completed": True,
        }
        status, set_res = make_request("POST", f"/workouts/{session_id}/sets", set_payload, token=self.token)
        self.assertEqual(status, 200)

        # Finish session
        status, finished = make_request("POST", f"/workouts/{session_id}/finish", {}, token=self.token)
        self.assertEqual(status, 200)

        # 2. Test GET /workouts/history
        status, history = make_request("GET", "/workouts/history", token=self.token)
        self.assertEqual(status, 200)
        self.assertTrue(len(history) >= 1)
        target_s = next((s for s in history if s["id"] == session_id), None)
        self.assertIsNotNone(target_s)
        self.assertIn("date_formatted", target_s)
        self.assertIn(target_s.get("session_split"), ("Tren Superior", "Tren Inferior"))
        self.assertTrue(len(target_s["sets"]) >= 1)

        # 2b. Test PATCH /workouts/{session_id} (edit date, notes, and sets)
        existing_set_id = target_s["sets"][0]["id"]
        patch_payload = {
            "date": "2026-10-15",
            "notes": "Sesión editada",
            "sets": [
                {
                    "id": existing_set_id,
                    "exercise_id": 1,
                    "set_number": 1,
                    "weight": 100.0,
                    "reps": 8,
                    "completed": True,
                },
                {
                    "exercise_id": 1,
                    "set_number": 2,
                    "weight": 100.0,
                    "reps": 6,
                    "completed": True,
                },
            ],
        }
        status, patched = make_request("PATCH", f"/workouts/{session_id}", patch_payload, token=self.token)
        self.assertEqual(status, 200)
        self.assertEqual(patched["date"], "2026-10-15")
        self.assertEqual(patched["notes"], "Sesión editada")
        self.assertEqual(len(patched["sets"]), 2)
        self.assertEqual(patched["total_volume"], 1400.0)

        # 3. Test DELETE /workouts/{session_id}
        status, del_res = make_request("DELETE", f"/workouts/{session_id}", token=self.token)
        self.assertEqual(status, 200)
        self.assertTrue(del_res.get("deleted"))
        self.assertIn("total_volume_kg", del_res)
        self.assertIn("total_sets", del_res)

        # Verify session is gone from history
        status, history_after = make_request("GET", "/workouts/history", token=self.token)
        self.assertEqual(status, 200)
        remaining_ids = [s["id"] for s in history_after]
        self.assertNotIn(session_id, remaining_ids)


if __name__ == "__main__":
    unittest.main()
