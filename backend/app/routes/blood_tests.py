import datetime as dt
import io
import re
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .. import models, schemas
from ..database import DATA_DIR, get_db
from ..security import get_current_user

try:
    import pypdf
except ImportError:
    pypdf = None

router = APIRouter()

UPLOADS_DIR = DATA_DIR / "uploads" / "blood_tests"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def parse_iso_date(raw_date: str) -> dt.date | None:
    """
    Convierte cadenas 'DD/MM/YY' o 'DD/MM/YYYY' a dt.date normalizado (ISO: YYYY-MM-DD).
    Ejemplos:
      '28/01/25' -> dt.date(2025, 1, 28)
      '23/01/26' -> dt.date(2026, 1, 23)
      '26/02/2001' -> dt.date(2001, 2, 26)
    """
    if not raw_date:
        return None
    raw = raw_date.strip().replace("-", "/")
    tokens = raw.split("/")
    if len(tokens) != 3:
        return None
    try:
        parts = [int(p) for p in tokens]
        day, month, year = parts[0], parts[1], parts[2]
        if year < 100:
            year += 2000
        return dt.date(year, month, day)
    except ValueError:
        return None


def extract_study_metadata(text: str) -> dict[str, Any]:
    """
    Extrae estrictamente entry_date, birth_date, petition_number y datos del paciente.
    Evita colisiones entre 'Fecha Nacimiento' y 'Fecha Ingreso'.
    """
    # 1. Fecha del análisis (entry_date)
    # Extraer ÚNICAMENTE tras el patrón: Fecha Ingreso:\s*(\d{2}/\d{2}/\d{2,4})
    entry_date = None
    m_entry = re.search(r'Fecha\s+Ingreso:\s*(\d{2}/\d{2}/\d{2,4})', text, re.IGNORECASE)
    if m_entry:
        entry_date = parse_iso_date(m_entry.group(1))

    # Fallback si el PDF no contiene 'Fecha Ingreso' (ej. reportes genéricos con 'Fecha: DD/MM/YYYY'):
    # Cuidado estricto: NO coincidir jamás con Fecha Nacimiento!
    if not entry_date:
        for m in re.finditer(r'(?:^|[^\w])Fecha:\s*(\d{2}/\d{2}/\d{2,4})', text, re.IGNORECASE):
            preceding = text[max(0, m.start() - 25):m.start()].lower()
            if "nacimiento" not in preceding:
                entry_date = parse_iso_date(m.group(1))
                break

    if not entry_date:
        entry_date = dt.date.today()

    # 2. Fecha de nacimiento (birth_date)
    # Extraer del campo: Fecha Nacimiento:\s*(\d{2}/\d{2}/\d{4})
    birth_date = None
    m_birth = re.search(r'Fecha\s+Nacimiento:\s*(\d{2}/\d{2}/\d{4})', text, re.IGNORECASE)
    if m_birth:
        birth_date = parse_iso_date(m_birth.group(1))

    # 3. Número de petición (petition_number)
    # Extraer tras: Número Petición:\s*(\d+)
    petition_number = None
    m_pet = re.search(r'N[úu]mero\s+Peti[cç]i[óo]n:\s*(\d+)', text, re.IGNORECASE)
    if m_pet:
        petition_number = m_pet.group(1).strip()

    # 4. Datos del paciente (Nombre, DNI)
    m_name = re.search(r'Apellido\s+y\s+Nombre:\s*([^,\n\r]+(?:,\s*[^\n\r]+?))(?:\s+N[úu]mero|\n|$)', text, re.IGNORECASE)
    patient_name = m_name.group(1).strip() if m_name else None

    m_dni = re.search(r'DNI:\s*(\d+)', text, re.IGNORECASE)
    patient_dni = m_dni.group(1).strip() if m_dni else None

    return {
        "entry_date": entry_date,
        "birth_date": birth_date,
        "petition_number": petition_number,
        "patient": {
            "name": patient_name,
            "dni": patient_dni,
            "birth_date": birth_date.isoformat() if birth_date else None,
            "petition_number": petition_number,
            "entry_date": entry_date.isoformat() if entry_date else None,
        },
    }


def extract_numeric_value(pattern: str, text: str, min_val: float, max_val: float) -> float | None:
    """Extrae el primer valor numérico asociado a un patrón regex respetando límites fisiológicos."""
    m = re.search(pattern, text, re.IGNORECASE)
    if m:
        val_str = m.group(1).replace(",", ".")
        try:
            val = float(val_str)
            if min_val <= val <= max_val:
                return round(val, 2)
        except ValueError:
            pass
    return None


def extract_blood_test_values(text: str) -> dict[str, Any]:
    """
    Analiza el texto de laboratorio y extrae parámetros clínicos clave
    y secciones dinámicas (Hemograma, Transaminasas, Lípidos, Riñón,
    Ácido Úrico, Clearance 24h, Inmunología y Electrolitos).
    """
    meta = extract_study_metadata(text)
    entry_date = meta["entry_date"]
    birth_date = meta["birth_date"]
    petition_number = meta["petition_number"]
    patient = meta["patient"]

    # 1. Hemograma
    hematocrit = extract_numeric_value(r'\b(?:hematocrito|hto|hct)\b[^\d\n\r]*?(\d{1,2}(?:[.,]\d+)?)', text, 20.0, 65.0)
    hemoglobin = extract_numeric_value(r'\b(?:hemoglobina|hb)\b[^\d\n\r]*?(\d{1,2}(?:[.,]\d+)?)', text, 6.0, 25.0)
    leukocytes = extract_numeric_value(r'\bleucocitos\b[^\d\n\r]*?(\d{1,2}(?:[.,]\d+)?)', text, 1.0, 50.0)
    platelets = extract_numeric_value(r'(?:recuento\s+de\s+plaquetas|plaquetas)[^\d\n\r]*?(\d{2,4}(?:[.,]\d+)?)', text, 30.0, 1000.0)
    erythrocyte_sedimentation = extract_numeric_value(r'eritrosedimentaci[oó]n[^\d\n\r]*?(\d{1,3}(?:[.,]\d+)?)', text, 0.0, 120.0)

    # 2. Química Clínica & Riñón
    glucose = extract_numeric_value(r'\b(?:glucemia(?:\s+en\s+ayunas)?|glucosa|glicemia)\b[^\d\n\r]*?(\d{2,3}(?:[.,]\d+)?)', text, 40.0, 500.0)
    urea = extract_numeric_value(r'\b(?:uremia|urea(?:\s+plasm[aá]tica|\s+s[eé]rica)?)\b[^\d\n\r]*?(\d{1,3}(?:[.,]\d+)?)', text, 5.0, 200.0)
    creatinine = extract_numeric_value(r'\b(?:creatinina(?:\s+s[eé]rica|\s+en\s+sangre)?|creatininemia)\b[^\d\n\r]*?(\d{1,2}(?:[.,]\d+)?)', text, 0.2, 10.0)
    uric_acid = extract_numeric_value(r'[aá]cido\s+[uú]rico(?:\s+en\s+suero)?[^\d\n\r]*?(\d{1,2}(?:[.,]\d+)?)', text, 0.5, 25.0)
    gfr_mdrd = extract_numeric_value(r'filtrado\s+glomerular[^\d\n\r]*?(\d{1,3}(?:[.,]\d+)?)', text, 10.0, 200.0)

    # 3. Hígado / Hepatograma
    got_ast = extract_numeric_value(
        r'\b(?:got\s*/\s*ast|got|ast|transaminasa\s+oxalac[eé]tica|aspartato\s+aminotransferasa|trans\.?\s+glut[aá]mico\s+oxalac[eé]tica)\b[^\d\n\r]*?(\d{1,3}(?:[.,]\d+)?)',
        text, 5.0, 500.0
    )
    gpt_alt = extract_numeric_value(
        r'\b(?:gpt\s*/\s*alt|gpt|alt|transaminasa\s+pir[uú]vica|alanina\s+aminotransferasa|trans\.?\s+glut[aá]mico\s+pir[uú]vica)\b[^\d\n\r]*?(\d{1,3}(?:[.,]\d+)?)',
        text, 5.0, 500.0
    )
    bilirubin_total = extract_numeric_value(r'bilirrubina\s+total[^\d\n\r]*?(\d{1,2}(?:[.,]\d+)?)', text, 0.05, 30.0)
    bilirubin_direct = extract_numeric_value(r'bilirrubina\s+directa[^\d\n\r]*?(\d{1,2}(?:[.,]\d+)?)', text, 0.0, 10.0)
    bilirubin_indirect = extract_numeric_value(r'bilirrubina\s+indirecta[^\d\n\r]*?(\d{1,2}(?:[.,]\d+)?)', text, 0.0, 20.0)
    alkaline_phosphatase = extract_numeric_value(r'fosfatasa\s+alcalina[^\d\n\r]*?(\d{1,4}(?:[.,]\d+)?)', text, 10.0, 1000.0)

    # 4. Perfil Lipídico
    cholesterol_total = extract_numeric_value(
        r'\b(?:colesterol\s+total|colesterolemia\s+total|colesterol(?!\s*(?:hdl|ldl|vldl)))\b[^\d\n\r]*?(\d{2,3}(?:[.,]\d+)?)',
        text, 50.0, 500.0
    )
    cholesterol_hdl = extract_numeric_value(
        r'\b(?:colesterol\s+hdl|hdl\s+colesterol|colesterol\s+ligado\s+a\s+hdl|c-hdl|hdl)\b[^\d\n\r]*?(\d{1,3}(?:[.,]\d+)?)',
        text, 10.0, 150.0
    )
    cholesterol_ldl = extract_numeric_value(
        r'\b(?:colesterol\s+ldl|ldl\s+colesterol|colesterol\s+ligado\s+a\s+ldl|c-ldl|ldl)\b[^\d\n\r]*?(\d{1,3}(?:[.,]\d+)?)',
        text, 20.0, 300.0
    )
    triglycerides = extract_numeric_value(
        r'\b(?:triglic[eé]ridos|trigliceridemia)\b[^\d\n\r]*?(\d{2,4}(?:[.,]\d+)?)',
        text, 30.0, 1000.0
    )

    # 5. Electrolitos
    sodium = extract_numeric_value(r'(?:sodio\s+en\s+sangre|sodio|natremia|ionograma\s*-\s*sodio)\b[^\d\n\r]*?(\d{2,3}(?:[.,]\d+)?)', text, 100.0, 180.0)
    potassium = extract_numeric_value(r'(?:potasio\s+en\s+sangre|potasio|kalemia|ionograma\s*-\s*potasio)\b[^\d\n\r]*?(\d{1,2}(?:[.,]\d+)?)', text, 1.5, 9.0)
    chloride = extract_numeric_value(r'(?:cloro\s+en\s+sangre|cloro|cloremia)\b[^\d\n\r]*?(\d{2,3}(?:[.,]\d+)?)', text, 50.0, 150.0)

    # 6. Clearance de Creatinina en Orina de 24 hs
    diuresis = extract_numeric_value(r'diuresis:\s*(\d+(?:[.,]\d+)?)', text, 100.0, 10000.0)
    cr_urine_24h = extract_numeric_value(r'creatinina\s+en\s+orina(?:\s+24\s*hs)?[^\d\n\r]*?(\d{1,2}(?:[.,]\d+)?)', text, 0.1, 50.0)
    depuration = extract_numeric_value(r'depura(?:ci[oó]n|c[oó]n)\s+de\s+creatinina[^\d\n\r]*?(\d{1,4}(?:[.,]\d+)?)', text, 5.0, 1000.0)
    dce_sup_corp = extract_numeric_value(r'dce\s+corr[^\d\n\r]*?(\d{1,4}(?:[.,]\d+)?)', text, 5.0, 1000.0)
    creatininuria = extract_numeric_value(r'creatininuria[^\d\n\r]*?(\d{1,4}(?:[.,]\d+)?)', text, 1.0, 1000.0)
    creatinine_excretion = extract_numeric_value(r'excreci[óo]n\s+de\s+creatinina[^\d\n\r]*?(\d{1,4}(?:[.,]\d+)?)', text, 1.0, 500.0)

    # 7. Inmunología
    aelo = extract_numeric_value(r'aelo(?:\s*\([^\)]+\))?[^\d\n\r]*?(\d{1,4}(?:[.,]\d+)?)', text, 1.0, 5000.0)
    hiv_negative = bool(re.search(r'HIV.*NO\s+REACTIVO', text, re.IGNORECASE))

    # Construir diccionarios de secciones dinámicas
    clearance_dict: dict[str, Any] = {}
    if diuresis is not None:
        clearance_dict["diuresis"] = {"label": "Diuresis 24h", "value": diuresis, "unit": "mL"}
    if cr_urine_24h is not None:
        clearance_dict["creatinine_urine_24h"] = {"label": "Creatinina en orina 24 hs", "value": cr_urine_24h, "unit": "g/24 hs", "ref": "0.8 - 2.0"}
    if depuration is not None:
        clearance_dict["depuration"] = {"label": "Depuración de creatinina", "value": depuration, "unit": "mL/min", "ref": ">= 60"}
    if dce_sup_corp is not None:
        clearance_dict["dce_sup_corp"] = {"label": "DCE Corr. sup. Corporal", "value": dce_sup_corp, "unit": "mL/min"}
    if creatininuria is not None:
        clearance_dict["creatininuria"] = {"label": "Creatininuria", "value": creatininuria, "unit": "mg/dL"}
    if creatinine_excretion is not None:
        clearance_dict["creatinine_excretion"] = {"label": "Excreción de Creatinina", "value": creatinine_excretion, "unit": "mg/Kg/24 hs"}

    inmuno_dict: dict[str, Any] = {}
    if aelo is not None:
        inmuno_dict["aelo"] = {"label": "AELO Cuantitativo", "value": aelo, "unit": "UI/mL", "ref": "Hasta 200"}
    if hiv_negative:
        inmuno_dict["hiv"] = {"label": "HIV-P-24 Combo", "value_text": "NO REACTIVO"}

    electro_dict: dict[str, Any] = {}
    if sodium is not None:
        electro_dict["sodium"] = {"label": "Sodio (Na)", "value": sodium, "unit": "mEq/L", "ref": "136 - 145"}
    if potassium is not None:
        electro_dict["potassium"] = {"label": "Potasio (K)", "value": potassium, "unit": "mEq/L", "ref": "3.5 - 5.1"}
    if chloride is not None:
        electro_dict["chloride"] = {"label": "Cloro (Cl)", "value": chloride, "unit": "mEq/L", "ref": "98 - 107"}

    # Construir data_json flexible y completo
    data_json: dict[str, Any] = {
        "patient": patient,
        "entry_date": entry_date.isoformat() if entry_date else None,
        "birth_date": birth_date.isoformat() if birth_date else None,
        "petition_number": petition_number,
        "sections": {
            "hemograma": {
                "title": "Hemograma",
                "items": {
                    k: v for k, v in {
                        "hematocrit": {"label": "Hematocrito", "value": hematocrit, "unit": "%", "ref": "40 - 54"} if hematocrit else None,
                        "hemoglobin": {"label": "Hemoglobina", "value": hemoglobin, "unit": "g/dL", "ref": "14 - 18"} if hemoglobin else None,
                        "leukocytes": {"label": "Leucocitos", "value": leukocytes, "unit": "x10^3/µL", "ref": "4.00 - 10.00"} if leukocytes else None,
                        "platelets": {"label": "Plaquetas", "value": platelets, "unit": "x10^3/µL", "ref": "150 - 450"} if platelets else None,
                        "erythrocyte_sedimentation": {"label": "Eritrosedimentación", "value": erythrocyte_sedimentation, "unit": "mm/h"} if erythrocyte_sedimentation else None,
                    }.items() if v is not None
                },
            },
            "quimica": {
                "title": "Química Clínica & Riñón",
                "items": {
                    k: v for k, v in {
                        "glucose": {"label": "Glucemia", "value": glucose, "unit": "mg/dL", "ref": "72 - 106"} if glucose else None,
                        "urea": {"label": "Uremia", "value": urea, "unit": "mg/dL", "ref": "< 50"} if urea else None,
                        "creatinine": {"label": "Creatinina en sangre", "value": creatinine, "unit": "mg/dL", "ref": "0.7 - 1.2"} if creatinine else None,
                        "uric_acid": {"label": "Ácido Úrico en Suero", "value": uric_acid, "unit": "mg/dL", "ref": "3.4 - 7.0"} if uric_acid else None,
                        "gfr_mdrd": {"label": "Filtrado Glomerular Est. (MDRD)", "value": gfr_mdrd, "unit": "mL/min", "ref": "> 60"} if gfr_mdrd else None,
                    }.items() if v is not None
                },
            },
            "hepatograma": {
                "title": "Hígado (Transaminasas)",
                "items": {
                    k: v for k, v in {
                        "got_ast": {"label": "GOT / AST", "value": got_ast, "unit": "UI/L", "ref": "< 40"} if got_ast else None,
                        "gpt_alt": {"label": "GPT / ALT", "value": gpt_alt, "unit": "UI/L", "ref": "< 41"} if gpt_alt else None,
                        "bilirubin_total": {"label": "Bilirrubina Total", "value": bilirubin_total, "unit": "mg/dL", "ref": "< 1.2"} if bilirubin_total else None,
                        "bilirubin_direct": {"label": "Bilirrubina Directa", "value": bilirubin_direct, "unit": "mg/dL", "ref": "0.0 - 0.30"} if bilirubin_direct else None,
                        "bilirubin_indirect": {"label": "Bilirrubina Indirecta", "value": bilirubin_indirect, "unit": "mg/dL", "ref": "0.0 - 1.00"} if bilirubin_indirect else None,
                        "alkaline_phosphatase": {"label": "Fosfatasa Alcalina", "value": alkaline_phosphatase, "unit": "UI/L", "ref": "40 - 129"} if alkaline_phosphatase else None,
                    }.items() if v is not None
                },
            },
            "perfil_lipidico": {
                "title": "Perfil Lipídico",
                "items": {
                    k: v for k, v in {
                        "cholesterol_total": {"label": "Colesterol Total", "value": cholesterol_total, "unit": "mg/dL", "ref": "< 200"} if cholesterol_total else None,
                        "cholesterol_hdl": {"label": "Colesterol HDL", "value": cholesterol_hdl, "unit": "mg/dL", "ref": "> 56"} if cholesterol_hdl else None,
                        "cholesterol_ldl": {"label": "Colesterol LDL", "value": cholesterol_ldl, "unit": "mg/dL", "ref": "< 100"} if cholesterol_ldl else None,
                        "triglycerides": {"label": "Triglicéridos", "value": triglycerides, "unit": "mg/dL", "ref": "< 200"} if triglycerides else None,
                    }.items() if v is not None
                },
            },
            "electrolitos": {
                "title": "Electrolitos",
                "items": electro_dict,
            },
            "clearance_creatinina": {
                "title": "Función Renal & Clearance 24h",
                "items": clearance_dict,
            },
            "inmunologia": {
                "title": "Inmunología",
                "items": inmuno_dict,
            },
        },
        # Direct property helpers para acceso inmediato
        "clearance_creatinina": clearance_dict if clearance_dict else None,
        "inmunologia": inmuno_dict if inmuno_dict else None,
        "electrolitos": electro_dict if electro_dict else None,
        "uric_acid": uric_acid,
        "chloride": chloride,
        "leukocytes": leukocytes,
        "platelets": platelets,
        "gfr_mdrd": gfr_mdrd,
        "bilirubin_total": bilirubin_total,
        "bilirubin_direct": bilirubin_direct,
        "bilirubin_indirect": bilirubin_indirect,
        "alkaline_phosphatase": alkaline_phosphatase,
    }

    return {
        "test_date": entry_date,
        "entry_date": entry_date,
        "birth_date": birth_date,
        "petition_number": petition_number,
        "patient": patient,
        "data_json": data_json,
        "hematocrit": hematocrit,
        "hemoglobin": hemoglobin,
        "glucose": glucose,
        "creatinine": creatinine,
        "urea": urea,
        "got_ast": got_ast,
        "gpt_alt": gpt_alt,
        "cholesterol_total": cholesterol_total,
        "cholesterol_hdl": cholesterol_hdl,
        "cholesterol_ldl": cholesterol_ldl,
        "triglycerides": triglycerides,
        "sodium": sodium,
        "potassium": potassium,
    }


def repair_legacy_blood_tests(db: Session) -> int:
    """
    Repara registros antiguos cuyo test_date fue asignado erróneamente a la fecha
    de nacimiento (ej. 2001-02-26) o que carecen de data_json enriquecido.
    """
    if not pypdf:
        return 0

    repaired_count = 0
    records = db.query(models.BloodTest).all()
    for rec in records:
        needs_repair = (
            rec.data_json is None
            or str(rec.test_date) == "2001-02-26"
            or rec.petition_number is None
            or rec.entry_date is None
        )
        if not needs_repair:
            continue

        # Buscar archivo PDF asociado
        candidate_file = None
        if rec.pdf_filename:
            matches = list(UPLOADS_DIR.glob(f"*{rec.pdf_filename}*"))
            if matches:
                candidate_file = matches[0]

        if not candidate_file or not candidate_file.exists():
            continue

        try:
            reader = pypdf.PdfReader(str(candidate_file))
            extracted_text = ""
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    extracted_text += t + "\n"

            parsed = extract_blood_test_values(extracted_text)
            rec.test_date = parsed["entry_date"]
            rec.entry_date = parsed["entry_date"]
            rec.birth_date = parsed["birth_date"]
            rec.petition_number = parsed["petition_number"]
            rec.data_json = parsed["data_json"]

            # Actualizar biomarcadores si no estaban seteados
            if rec.hematocrit is None: rec.hematocrit = parsed["hematocrit"]
            if rec.hemoglobin is None: rec.hemoglobin = parsed["hemoglobin"]
            if rec.glucose is None: rec.glucose = parsed["glucose"]
            if rec.creatinine is None: rec.creatinine = parsed["creatinine"]
            if rec.urea is None: rec.urea = parsed["urea"]
            if rec.got_ast is None: rec.got_ast = parsed["got_ast"]
            if rec.gpt_alt is None: rec.gpt_alt = parsed["gpt_alt"]
            if rec.cholesterol_total is None: rec.cholesterol_total = parsed["cholesterol_total"]
            if rec.cholesterol_hdl is None: rec.cholesterol_hdl = parsed["cholesterol_hdl"]
            if rec.cholesterol_ldl is None: rec.cholesterol_ldl = parsed["cholesterol_ldl"]
            if rec.triglycerides is None: rec.triglycerides = parsed["triglycerides"]
            if rec.sodium is None: rec.sodium = parsed["sodium"]
            if rec.potassium is None: rec.potassium = parsed["potassium"]

            db.add(rec)
            repaired_count += 1
        except Exception:
            pass

    if repaired_count > 0:
        db.commit()

    return repaired_count


@router.post("/upload-pdf", response_model=schemas.BloodTestOut)
async def upload_blood_test_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Extrae valores de laboratorio desde un archivo PDF y los persiste en blood_tests."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un documento PDF (.pdf)",
        )

    contents = await file.read()

    extracted_text = ""
    if pypdf:
        try:
            reader = pypdf.PdfReader(io.BytesIO(contents))
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    extracted_text += t + "\n"
        except Exception:
            pass

    parsed = extract_blood_test_values(extracted_text)

    # Guardar copia del archivo en disco
    timestamp = int(dt.datetime.now().timestamp())
    safe_name = f"blood_user_{current_user.id}_{timestamp}_{file.filename}"
    file_path = UPLOADS_DIR / safe_name
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception:
        pass

    blood_test = models.BloodTest(
        user_id=current_user.id,
        test_date=parsed["entry_date"],
        entry_date=parsed["entry_date"],
        birth_date=parsed["birth_date"],
        petition_number=parsed["petition_number"],
        data_json=parsed["data_json"],
        hematocrit=parsed["hematocrit"],
        hemoglobin=parsed["hemoglobin"],
        glucose=parsed["glucose"],
        creatinine=parsed["creatinine"],
        urea=parsed["urea"],
        got_ast=parsed["got_ast"],
        gpt_alt=parsed["gpt_alt"],
        cholesterol_total=parsed["cholesterol_total"],
        cholesterol_hdl=parsed["cholesterol_hdl"],
        cholesterol_ldl=parsed["cholesterol_ldl"],
        triglycerides=parsed["triglycerides"],
        sodium=parsed["sodium"],
        potassium=parsed["potassium"],
        pdf_filename=file.filename,
        notes="Valores detectados automáticamente vía PDF de laboratorio",
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(blood_test)
    db.commit()
    db.refresh(blood_test)

    return schemas.BloodTestOut.model_validate(blood_test)


@router.get("", response_model=list[schemas.BloodTestOut])
def get_blood_tests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retorna el historial de analíticas del usuario ordenadas por fecha."""
    try:
        repair_legacy_blood_tests(db)
    except Exception:
        pass

    tests = (
        db.query(models.BloodTest)
        .filter(models.BloodTest.user_id == current_user.id)
        .order_by(desc(models.BloodTest.test_date), desc(models.BloodTest.id))
        .all()
    )
    return [schemas.BloodTestOut.model_validate(t) for t in tests]


@router.post("", response_model=schemas.BloodTestOut, status_code=status.HTTP_201_CREATED)
def create_blood_test_manual(
    payload: schemas.BloodTestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Registra manualmente una analítica de laboratorio."""
    entry_date = payload.entry_date or payload.test_date

    data_json = payload.data_json
    if not data_json:
        data_json = {
            "patient": {
                "birth_date": payload.birth_date.isoformat() if payload.birth_date else None,
                "petition_number": payload.petition_number,
                "entry_date": entry_date.isoformat() if entry_date else None,
            },
            "entry_date": entry_date.isoformat() if entry_date else None,
            "birth_date": payload.birth_date.isoformat() if payload.birth_date else None,
            "petition_number": payload.petition_number,
            "sections": {
                "hemograma": {
                    "title": "Hemograma",
                    "items": {
                        k: v for k, v in {
                            "hematocrit": {"label": "Hematocrito", "value": payload.hematocrit, "unit": "%"} if payload.hematocrit else None,
                            "hemoglobin": {"label": "Hemoglobina", "value": payload.hemoglobin, "unit": "g/dL"} if payload.hemoglobin else None,
                        }.items() if v is not None
                    },
                },
                "quimica": {
                    "title": "Química Clínica & Riñón",
                    "items": {
                        k: v for k, v in {
                            "glucose": {"label": "Glucemia", "value": payload.glucose, "unit": "mg/dL"} if payload.glucose else None,
                            "creatinine": {"label": "Creatinina en sangre", "value": payload.creatinine, "unit": "mg/dL"} if payload.creatinine else None,
                            "urea": {"label": "Uremia", "value": payload.urea, "unit": "mg/dL"} if payload.urea else None,
                        }.items() if v is not None
                    },
                },
                "hepatograma": {
                    "title": "Hígado (Transaminasas)",
                    "items": {
                        k: v for k, v in {
                            "got_ast": {"label": "GOT / AST", "value": payload.got_ast, "unit": "UI/L"} if payload.got_ast else None,
                            "gpt_alt": {"label": "GPT / ALT", "value": payload.gpt_alt, "unit": "UI/L"} if payload.gpt_alt else None,
                        }.items() if v is not None
                    },
                },
                "perfil_lipidico": {
                    "title": "Perfil Lipídico",
                    "items": {
                        k: v for k, v in {
                            "cholesterol_total": {"label": "Colesterol Total", "value": payload.cholesterol_total, "unit": "mg/dL"} if payload.cholesterol_total else None,
                            "cholesterol_hdl": {"label": "Colesterol HDL", "value": payload.cholesterol_hdl, "unit": "mg/dL"} if payload.cholesterol_hdl else None,
                            "cholesterol_ldl": {"label": "Colesterol LDL", "value": payload.cholesterol_ldl, "unit": "mg/dL"} if payload.cholesterol_ldl else None,
                            "triglycerides": {"label": "Triglicéridos", "value": payload.triglycerides, "unit": "mg/dL"} if payload.triglycerides else None,
                        }.items() if v is not None
                    },
                },
                "electrolitos": {
                    "title": "Electrolitos",
                    "items": {
                        k: v for k, v in {
                            "sodium": {"label": "Sodio (Na)", "value": payload.sodium, "unit": "mEq/L"} if payload.sodium else None,
                            "potassium": {"label": "Potasio (K)", "value": payload.potassium, "unit": "mEq/L"} if payload.potassium else None,
                        }.items() if v is not None
                    },
                },
            },
        }

    test = models.BloodTest(
        user_id=current_user.id,
        test_date=entry_date,
        entry_date=entry_date,
        birth_date=payload.birth_date,
        petition_number=payload.petition_number,
        data_json=data_json,
        hematocrit=payload.hematocrit,
        hemoglobin=payload.hemoglobin,
        glucose=payload.glucose,
        creatinine=payload.creatinine,
        urea=payload.urea,
        got_ast=payload.got_ast,
        gpt_alt=payload.gpt_alt,
        cholesterol_total=payload.cholesterol_total,
        cholesterol_hdl=payload.cholesterol_hdl,
        cholesterol_ldl=payload.cholesterol_ldl,
        triglycerides=payload.triglycerides,
        sodium=payload.sodium,
        potassium=payload.potassium,
        notes=payload.notes,
        pdf_filename=payload.pdf_filename,
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return schemas.BloodTestOut.model_validate(test)


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_blood_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Elimina un registro de análisis de sangre."""
    test = (
        db.query(models.BloodTest)
        .filter(models.BloodTest.id == test_id, models.BloodTest.user_id == current_user.id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    db.delete(test)
    db.commit()
    return None
