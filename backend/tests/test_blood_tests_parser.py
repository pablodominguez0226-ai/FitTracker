import datetime as dt
from pathlib import Path
import unittest

from app.routes.blood_tests import (
    extract_study_metadata,
    extract_blood_test_values,
    parse_iso_date,
)
import app.routers.blood_tests as routers_blood_tests

try:
    import pypdf
except ImportError:
    pypdf = None


class TestBloodTestsParser(unittest.TestCase):
    def test_parse_iso_date(self):
        self.assertEqual(parse_iso_date("28/01/25"), dt.date(2025, 1, 28))
        self.assertEqual(parse_iso_date("23/01/26"), dt.date(2026, 1, 23))
        self.assertEqual(parse_iso_date("26/02/2001"), dt.date(2001, 2, 26))
        self.assertIsNone(parse_iso_date(None))
        self.assertIsNone(parse_iso_date(""))
        self.assertIsNone(parse_iso_date("invalid"))

    def test_extract_study_metadata_strict(self):
        raw_sample = (
            "Laboratorio San Rafael\n"
            "Apellido y Nombre: DOMINGUEZ, PABLO GABRIEL Número Petición: 60612242\n"
            "DNI: 43354552 Número Afiliado: 20889354/01\n"
            "Fecha Nacimiento: 26/02/2001 Fecha Ingreso: 23/01/26 9:32:19\n"
            "Edad: 24 años\n"
        )

        meta = extract_study_metadata(raw_sample)

        self.assertEqual(meta["entry_date"], dt.date(2026, 1, 23))
        self.assertEqual(meta["birth_date"], dt.date(2001, 2, 26))
        self.assertNotEqual(meta["entry_date"], meta["birth_date"])  # Strict check: NEVER confuse birth_date with entry_date
        self.assertEqual(meta["petition_number"], "60612242")
        self.assertEqual(meta["patient"]["name"], "DOMINGUEZ, PABLO GABRIEL")
        self.assertEqual(meta["patient"]["dni"], "43354552")
        self.assertEqual(meta["patient"]["birth_date"], "2001-02-26")
        self.assertEqual(meta["patient"]["petition_number"], "60612242")
        self.assertEqual(meta["patient"]["entry_date"], "2026-01-23")

    def test_extract_study_metadata_2025(self):
        raw_sample = (
            "Apellido y Nombre: DOMINGUEZ, PABLO GABRIEL Número Petición: 60543677\n"
            "DNI: 43354552 Número Afiliado: 20889354/01\n"
            "Fecha Nacimiento: 26/02/2001 Fecha Ingreso: 28/01/25 7:56:21\n"
        )

        meta = extract_study_metadata(raw_sample)

        self.assertEqual(meta["entry_date"], dt.date(2025, 1, 28))
        self.assertEqual(meta["birth_date"], dt.date(2001, 2, 26))
        self.assertEqual(meta["petition_number"], "60543677")

    def test_router_re_export_compatibility(self):
        self.assertTrue(hasattr(routers_blood_tests, "extract_study_metadata"))
        self.assertTrue(hasattr(routers_blood_tests, "extract_blood_test_values"))
        self.assertTrue(hasattr(routers_blood_tests, "parse_iso_date"))
        self.assertTrue(hasattr(routers_blood_tests, "router"))

    def test_real_pdf_extractions(self):
        if not pypdf:
            self.skipTest("pypdf not installed")

        pdf_dir = Path("/app/data/uploads/blood_tests")
        if not pdf_dir.exists():
            pdf_dir = Path("data/uploads/blood_tests")
        if not pdf_dir.exists():
            self.skipTest("PDF upload test directory not found")

        pdf_2025 = None
        pdf_2026 = None

        for p in pdf_dir.glob("*.pdf"):
            if "60543677" in p.name or "Analisis de sangre 2026 ." in p.name:
                pdf_2025 = p
            elif "60612242" in p.name or "analisis de sangre 2026 (1)" in p.name:
                pdf_2026 = p

        if pdf_2025 and pdf_2025.exists():
            reader = pypdf.PdfReader(str(pdf_2025))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            parsed = extract_blood_test_values(text)

            self.assertEqual(parsed["entry_date"], dt.date(2025, 1, 28))
            self.assertEqual(parsed["birth_date"], dt.date(2001, 2, 26))
            self.assertEqual(parsed["petition_number"], "60543677")
            self.assertEqual(parsed["hemoglobin"], 15.5)
            self.assertEqual(parsed["cholesterol_total"], 197.90)
            self.assertEqual(parsed["got_ast"], 34.00)
            self.assertEqual(parsed["gpt_alt"], 24.00)
            self.assertEqual(parsed["creatinine"], 1.10)
            self.assertIsNone(parsed["data_json"]["clearance_creatinina"])
            self.assertIsNotNone(parsed["data_json"]["electrolitos"])
            self.assertEqual(parsed["data_json"]["electrolitos"]["sodium"]["value"], 141.0)
            self.assertEqual(parsed["data_json"]["inmunologia"]["hiv"]["value_text"], "NO REACTIVO")

        if pdf_2026 and pdf_2026.exists():
            reader = pypdf.PdfReader(str(pdf_2026))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            parsed = extract_blood_test_values(text)

            self.assertEqual(parsed["entry_date"], dt.date(2026, 1, 23))
            self.assertEqual(parsed["birth_date"], dt.date(2001, 2, 26))
            self.assertEqual(parsed["petition_number"], "60612242")
            self.assertEqual(parsed["hemoglobin"], 15.8)
            self.assertEqual(parsed["cholesterol_total"], 175.00)
            self.assertEqual(parsed["got_ast"], 17.60)
            self.assertEqual(parsed["gpt_alt"], 13.00)
            self.assertEqual(parsed["creatinine"], 1.21)
            self.assertEqual(parsed["data_json"]["uric_acid"], 5.9)
            self.assertIsNotNone(parsed["data_json"]["clearance_creatinina"])
            self.assertEqual(parsed["data_json"]["clearance_creatinina"]["diuresis"]["value"], 3620.0)
            self.assertEqual(parsed["data_json"]["clearance_creatinina"]["depuration"]["value"], 322.86)
            self.assertEqual(parsed["data_json"]["inmunologia"]["aelo"]["value"], 651.0)


if __name__ == "__main__":
    unittest.main()
