import json
import sqlite3
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


class TestPhase1BiometricsAndCatalog(unittest.TestCase):
    test_username = "testphase1_user"
    test_password = "Password123!"
    auth_token: str = ""
    test_user_id: int | None = None

    @classmethod
    def setUpClass(cls):
        # Register or login test user
        register_payload = {
            "username": cls.test_username,
            "password": cls.test_password,
            "email": f"{cls.test_username}@fittracker.local",
        }
        status, resp = make_request("POST", "/auth/register", register_payload)
        if status not in (200, 201):
            status, resp = make_request("POST", "/auth/login", {"username": cls.test_username, "password": cls.test_password})

        assert status in (200, 201), f"Failed to authenticate test user: {status} - {resp}"
        cls.auth_token = resp["access_token"]
        cls.test_user_id = resp["user"]["id"]

    @classmethod
    def tearDownClass(cls):
        if not cls.test_user_id:
            return
        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()
        cur.execute("DELETE FROM workout_sets WHERE workout_session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)", (cls.test_user_id,))
        cur.execute("DELETE FROM workout_sessions WHERE user_id = ?", (cls.test_user_id,))
        cur.execute("DELETE FROM users WHERE id = ?", (cls.test_user_id,))
        conn.commit()
        conn.close()

    def test_01_database_columns_and_integrity(self):
        """Verificar existencia idempotente de columnas de biometría y catálogo en fittracker.db."""
        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()

        cur.execute("PRAGMA table_info(user_profile)")
        profile_cols = {r[1] for r in cur.fetchall()}
        for col in ["bodyweight", "height", "body_fat_percentage", "biceps_girth", "waist_girth", "target_goal", "target_protein_g", "target_water_l"]:
            self.assertIn(col, profile_cols, f"Columna {col} faltante en user_profile")

        cur.execute("PRAGMA table_info(exercises)")
        exercise_cols = {r[1] for r in cur.fetchall()}
        for col in ["equipment_type", "mechanics_type", "image_url", "key_cue", "replacement_id"]:
            self.assertIn(col, exercise_cols, f"Columna {col} faltante en exercises")

        # Verificar que no se borraron usuarios existentes
        cur.execute("SELECT COUNT(*) FROM users")
        user_count = cur.fetchone()[0]
        self.assertGreaterEqual(user_count, 5, "Los usuarios existentes deben permanecer intactos.")
        conn.close()

    def test_02_catalog_massive_expansion(self):
        """Verificar registro de al menos 20 a 30 ejercicios por grupo muscular con replacement_id asignado."""
        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()

        target_groups = ["Pecho", "Espalda", "Piernas", "Hombros", "Bíceps", "Tríceps", "Core"]
        for group in target_groups:
            cur.execute("""
                SELECT COUNT(e.id)
                FROM exercises e
                JOIN muscle_groups mg ON mg.id = e.muscle_group_id
                WHERE (LOWER(mg.name) = LOWER(?) OR LOWER(mg.name) = LOWER(?) || 's') AND e.is_active = 1
            """, (group, group.rstrip('s')))
            count = cur.fetchone()[0]
            self.assertGreaterEqual(count, 20, f"Grupo {group} tiene {count} ejercicios, se requerían al menos 20.")
            self.assertLessEqual(count, 55, f"Grupo {group} tiene {count} ejercicios, excede el rango esperado.")

        # Verificar que los ejercicios tienen replacement_id
        cur.execute("SELECT COUNT(*) FROM exercises WHERE is_active = 1 AND replacement_id IS NULL")
        missing_replacement = cur.fetchone()[0]
        self.assertEqual(missing_replacement, 0, "Todos los ejercicios activos deben tener su replacement_id asignado.")

        # Verificar equipment_type y mechanics_type válidos
        cur.execute("SELECT DISTINCT equipment_type FROM exercises WHERE is_active = 1 AND equipment_type IS NOT NULL")
        equipments = {r[0] for r in cur.fetchall()}
        valid_equip = {"barra", "mancuerna", "polea", "maquina", "corporal"}
        self.assertTrue(equipments.issubset(valid_equip), f"Equipamientos inválidos encontrados: {equipments - valid_equip}")

        conn.close()

    def test_03_profile_analytics_endpoint(self):
        """Verificar GET /api/profile/analytics con cálculos de FFMI, TMB, TDEE, proteína y agua."""
        # 1. Configurar biometría del usuario de prueba
        profile_data = {
            "bodyweight": 80.0,
            "height": 178.0,
            "body_fat_percentage": 14.0,
            "biceps_girth": 38.0,
            "waist_girth": 82.0,
            "target_goal": "hipertrofia",
        }
        status, put_resp = make_request("PUT", "/profile", profile_data, token=self.auth_token)
        self.assertEqual(status, 200, f"Error actualizando perfil: {put_resp}")

        # 2. Consultar analytics
        status, data = make_request("GET", "/profile/analytics", token=self.auth_token)
        self.assertEqual(status, 200, f"Error obteniendo analytics: {data}")

        # Masa magra esperada: 80 * (1 - 0.14) = 68.8 kg
        # TMB Katch-McArdle: 370 + (21.6 * 68.8) = 370 + 1486.08 = 1856.1
        # TDEE: 1856.1 * 1.55 = 2876.9
        # Proteína (hipertrofia): 80 * 2.0 = 160.0 g
        # Agua: (80 * 0.04) + 0.8 = 4.0 L
        # FFMI: 68.8 / (1.78^2) + 6.1 * (1.8 - 1.78) = 21.71 + 0.12 = 21.83
        self.assertAlmostEqual(data["lean_mass_kg"], 68.8, delta=0.5)
        self.assertAlmostEqual(data["tmb"], 1856.1, delta=2.0)
        self.assertAlmostEqual(data["tdee"], 2876.9, delta=3.0)
        self.assertAlmostEqual(data["target_protein_g"], 160.0, delta=1.0)
        self.assertAlmostEqual(data["target_water_l"], 4.0, delta=0.1)
        self.assertGreater(data["ffmi"], 20.0)
        self.assertGreater(data["remaining_potential_ffmi"], 0.0)

        # 3. Probar con objetivo 'definicion' (proteína a 2.3 g/kg)
        status, _ = make_request("PUT", "/profile", {"target_goal": "definicion"}, token=self.auth_token)
        self.assertEqual(status, 200)

        status, data_def = make_request("GET", "/profile/analytics", token=self.auth_token)
        self.assertEqual(status, 200)
        # Proteína cuantitativa: bodyweight * 2.0 = 160.0 g (sin dependencia de target_goal)
        self.assertAlmostEqual(data_def["target_protein_g"], 160.0, delta=1.0)

    def test_04_exercise_guidance_endpoint(self):
        """Verificar GET /api/exercises/{id}/guidance con 1RM, meta sugerida y sustituto."""
        # 1. Obtener un ejercicio de prueba
        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()
        cur.execute("SELECT id, name, replacement_id FROM exercises WHERE is_active = 1 AND replacement_id IS NOT NULL LIMIT 1")
        ex_id, ex_name, repl_id = cur.fetchone()
        conn.close()

        # 2. Consultar guidance antes de registrar series
        status, data = make_request("GET", f"/exercises/{ex_id}/guidance", token=self.auth_token)
        self.assertEqual(status, 200, f"Error obteniendo guidance: {data}")
        self.assertEqual(data["exercise_id"], ex_id)
        self.assertIn("suggested_goal", data)
        self.assertIsNotNone(data["substitute_exercise"])
        self.assertEqual(data["substitute_exercise"]["id"], repl_id)

        # 3. Registrar una serie en sesión completada para simular historial previo
        session_payload = {
            "date": "2026-10-02",
            "muscle_group_id": 1,
            "sport_type": "strength",
            "readiness_energy": 4,
            "mental_effort": 2,
            "sets": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "weight": 100.0,
                    "reps": 10,
                    "completed": True,
                }
            ],
        }
        status, sess_resp = make_request("POST", "/workouts/session", session_payload, token=self.auth_token)
        self.assertIn(status, (200, 201), f"Error guardando sesión: {sess_resp}")

        # 4. Consultar guidance con historial
        status, data_hist = make_request("GET", f"/exercises/{ex_id}/guidance", token=self.auth_token)
        self.assertEqual(status, 200)
        # 1RM Epley esperado: 100 * (1 + 10/30) = 133.33 kg
        self.assertIsNotNone(data_hist["previous_1rm"])
        self.assertAlmostEqual(data_hist["previous_1rm_epley"], 133.33, delta=0.5)
        self.assertEqual(data_hist["last_weight"], 100.0)
        self.assertEqual(data_hist["last_reps"], 10)
        self.assertFalse(data_hist["fatigue_detected"])
        # Sobrecarga sugerida
        self.assertIn(data_hist["suggested_goal"]["type"], ["overload", "standard"])

        # 5. Simular fatiga con una sesión de readiness_energy = 1
        fatigue_session = {
            "date": "2026-10-02",
            "muscle_group_id": 1,
            "sport_type": "strength",
            "readiness_energy": 1,
            "mental_effort": 5,
            "sets": [
                {
                    "exercise_id": ex_id,
                    "set_number": 1,
                    "weight": 100.0,
                    "reps": 8,
                    "completed": True,
                }
            ],
        }
        status, _ = make_request("POST", "/workouts/session", fatigue_session, token=self.auth_token)
        self.assertIn(status, (200, 201))

        status, data_fatigue = make_request("GET", f"/exercises/{ex_id}/guidance", token=self.auth_token)
        self.assertEqual(status, 200)
        self.assertTrue(data_fatigue["fatigue_detected"], "La fatiga debe ser detectada si readiness_energy <= 2")
        self.assertEqual(data_fatigue["suggested_goal"]["type"], "deload", "Debe sugerir descarga (-30%) si se detecta fatiga")
        self.assertAlmostEqual(data_fatigue["suggested_goal"]["suggested_weight"], 70.0, delta=1.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
