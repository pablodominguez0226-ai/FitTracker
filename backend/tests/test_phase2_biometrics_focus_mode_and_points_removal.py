"""
FASE 2 Test Suite: FitTracker
Tests covering:
1. Total elimination of points system:
   - Verification that point_transactions table does not exist in data/fittracker.db.
   - Verification that reward_points column does not exist in users or user_profile.
   - Verification that /api/rewards/* endpoints are removed (return 404).
   - Verification that /api/leaderboard does not include points or reward badges.
2. Biometric and quantitative profile update:
   - Verification of PUT /api/auth/profile with bodyweight, height, body_fat_percentage, biceps_girth, waist_girth, target_goal.
   - Verification of GET /api/profile/analytics returning pure numeric dashboard values (FFMI, TDEE, target_protein_g, target_water_l).
3. Exercise guidance and replacement:
   - Verification of GET /api/exercises/{id}/guidance returning suggested_goal and substitute_exercise.
"""

import os
import sqlite3
import unittest
import requests

API_URL = os.environ.get("API_URL", "http://localhost:80/api")
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "fittracker.db")


class TestPhase2PointsRemovalAndBiometrics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.username = f"phase2_test_{int(os.times().elapsed * 1000)}"
        cls.password = "Secr3tP@ss2026!"
        cls.email = f"{cls.username}@test.com"

        # Register user
        reg_res = requests.post(
            f"{API_URL}/auth/register",
            json={"username": cls.username, "password": cls.password, "email": cls.email},
            timeout=10,
        )
        assert reg_res.status_code in (200, 201), f"Register failed: {reg_res.text}"
        data = reg_res.json()
        cls.token = data.get("access_token")
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

        # Get test user id
        me_res = requests.get(f"{API_URL}/auth/me", headers=cls.headers, timeout=10)
        assert me_res.status_code == 200
        cls.test_user_id = me_res.json()["id"]

    @classmethod
    def tearDownClass(cls):
        # Clean test user from database safely
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("DELETE FROM workout_sets WHERE workout_session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)", (cls.test_user_id,))
            cur.execute("DELETE FROM workout_sessions WHERE user_id = ?", (cls.test_user_id,))
            cur.execute("DELETE FROM user_profile WHERE id = ?", (cls.test_user_id,))
            cur.execute("DELETE FROM users WHERE id = ?", (cls.test_user_id,))
            conn.commit()
            conn.close()

    def test_01_database_points_elimination(self):
        """Verificar en SQLite que point_transactions y reward_points fueron eliminados."""
        self.assertTrue(os.path.exists(DB_PATH), f"Database not found at {DB_PATH}")
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()

        # 1. point_transactions table must NOT exist
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='point_transactions'")
        table = cur.fetchone()
        self.assertIsNone(table, "Table point_transactions must not exist in database")

        # 2. reward_points must NOT exist in users table
        cur.execute("PRAGMA table_info(users)")
        users_cols = [row[1] for row in cur.fetchall()]
        self.assertNotIn("reward_points", users_cols, "Column reward_points must not exist in users")

        # 3. reward_points must NOT exist in user_profile table
        cur.execute("PRAGMA table_info(user_profile)")
        profile_cols = [row[1] for row in cur.fetchall()]
        self.assertNotIn("reward_points", profile_cols, "Column reward_points must not exist in user_profile")

        conn.close()

    def test_02_backend_points_endpoints_removed(self):
        """Verificar que /api/rewards/* y endpoints de puntos devuelven 404."""
        # /api/rewards
        res = requests.get(f"{API_URL}/rewards", headers=self.headers, timeout=5)
        self.assertEqual(res.status_code, 404, "GET /api/rewards must return 404")

        # /api/rewards/my-points
        res2 = requests.get(f"{API_URL}/rewards/my-points", headers=self.headers, timeout=5)
        self.assertEqual(res2.status_code, 404, "GET /api/rewards/my-points must return 404")

        # /api/leaderboard must not contain points_reward or current_user_points
        lead_res = requests.get(f"{API_URL}/leaderboard", headers=self.headers, timeout=5)
        self.assertEqual(lead_res.status_code, 200)
        lead_data = lead_res.json()
        self.assertNotIn("current_user_points", lead_data)
        if lead_data.get("entries"):
            for entry in lead_data["entries"]:
                self.assertNotIn("points_reward", entry)

    def test_03_biometric_profile_update_and_analytics(self):
        """Verificar guardado de los 5 campos cuantitativos y dashboard analítico."""
        payload = {
            "bodyweight": 82.5,
            "height": 181.0,
            "body_fat_percentage": 13.5,
            "biceps_girth": 39.5,
            "waist_girth": 81.0,
            "target_goal": "hipertrofia",
        }
        put_res = requests.put(f"{API_URL}/auth/profile", json=payload, headers=self.headers, timeout=10)
        self.assertEqual(put_res.status_code, 200, f"Profile update failed: {put_res.text}")
        data = put_res.json()
        self.assertEqual(data["bodyweight"], 82.5)
        self.assertEqual(data["height"], 181.0)
        self.assertEqual(data["body_fat_percentage"], 13.5)
        self.assertEqual(data["biceps_girth"], 39.5)
        self.assertEqual(data["waist_girth"], 81.0)
        self.assertEqual(data["target_goal"], "hipertrofia")

        # Verificar GET /api/profile/analytics
        an_res = requests.get(f"{API_URL}/profile/analytics", headers=self.headers, timeout=10)
        self.assertEqual(an_res.status_code, 200, f"Analytics failed: {an_res.text}")
        an_data = an_res.json()
        self.assertGreater(an_data["ffmi"], 18.0)
        self.assertGreater(an_data["lean_mass_kg"], 60.0)
        self.assertGreater(an_data["tdee"], 2000.0)
        self.assertGreater(an_data["target_protein_g"], 150.0)
        self.assertGreater(an_data["target_water_l"], 3.0)
        self.assertEqual(an_data["max_natural_ffmi"], 25.0)

    def test_04_exercise_guidance_and_replacement(self):
        """Verificar GET /api/exercises/{id}/guidance para recomendación y sustituto."""
        # Find an exercise with replacement_id
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT id, name, replacement_id FROM exercises WHERE replacement_id IS NOT NULL LIMIT 1")
        row = cur.fetchone()
        conn.close()

        if row:
            ex_id, ex_name, repl_id = row
            g_res = requests.get(f"{API_URL}/exercises/{ex_id}/guidance", headers=self.headers, timeout=10)
            self.assertEqual(g_res.status_code, 200, f"Guidance failed: {g_res.text}")
            g_data = g_res.json()
            self.assertIn("suggested_goal", g_data)
            self.assertIn("suggested_weight", g_data["suggested_goal"])
            self.assertIn("suggested_reps", g_data["suggested_goal"])
            self.assertIsNotNone(g_data["substitute_exercise"])
            self.assertEqual(g_data["substitute_exercise"]["id"], repl_id)


if __name__ == "__main__":
    unittest.main()
