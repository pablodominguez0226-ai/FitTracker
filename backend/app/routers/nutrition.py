import datetime as dt
import json
import os
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import DATA_DIR, get_db
from ..security import get_current_user

router = APIRouter()

UPLOADS_DIR = DATA_DIR / "uploads" / "nutrition"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


# ====================================================================
# 1. MODO MACROS & CALCULADORA
# ====================================================================

@router.post("/calculate-macros", response_model=schemas.MacroCalculateResult)
def calculate_macros(
    payload: schemas.MacroCalculateRequest,
):
    """Calcula macros y calorías en base a peso corporal y objetivo."""
    bw = payload.bodyweight
    goal = payload.goal.lower()

    # Factores según objetivo
    if goal == "definicion":
        # Déficit calórico moderado
        cal_per_kg = 28
        prot_per_kg = payload.protein_per_kg or 2.3
        fat_per_kg = payload.fats_per_kg or 0.8
    elif goal == "hipertrofia":
        # Superávit calórico controlado (Heavy Duty / Masa magra)
        cal_per_kg = 36
        prot_per_kg = payload.protein_per_kg or 2.2
        fat_per_kg = payload.fats_per_kg or 1.0
    else:  # mantenimiento
        cal_per_kg = 32
        prot_per_kg = payload.protein_per_kg or 2.0
        fat_per_kg = payload.fats_per_kg or 0.9

    total_calories = int(bw * cal_per_kg)
    protein_g = int(bw * prot_per_kg)
    fats_g = int(bw * fat_per_kg)

    # Carbohidratos cubren las calorías restantes (4 kcal/g)
    calories_from_prot = protein_g * 4
    calories_from_fats = fats_g * 9
    rem_calories = max(0, total_calories - (calories_from_prot + calories_from_fats))
    carbs_g = int(rem_calories / 4)

    return schemas.MacroCalculateResult(
        calories=total_calories,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fats_g=fats_g,
        protein_per_kg=round(prot_per_kg, 2),
        fats_per_kg=round(fat_per_kg, 2),
        goal=goal,
    )


@router.get("/today", response_model=schemas.DailyNutritionLogOut)
def get_today_nutrition(
    date_str: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Obtiene el registro de nutrición y cumplimiento de macros de la fecha."""
    target_date = dt.date.today()
    if date_str:
        try:
            target_date = dt.date.fromisoformat(date_str)
        except ValueError:
            pass

    log = (
        db.query(models.DailyNutritionLog)
        .filter(
            models.DailyNutritionLog.user_id == current_user.id,
            models.DailyNutritionLog.date == target_date,
        )
        .first()
    )

    if not log:
        # Calcular defaults a partir del usuario si no existe log todavía
        bw = current_user.bodyweight or 75.0
        target_prot = current_user.target_protein_g or round(bw * 2.2, 1)
        target_fats = round(bw * 0.9, 1)
        target_cals = round(bw * 34, 0)
        target_carbs = round(max(0, target_cals - (target_prot * 4 + target_fats * 9)) / 4, 1)

        log = models.DailyNutritionLog(
            user_id=current_user.id,
            date=target_date,
            calories_consumed=0.0,
            protein_consumed=0.0,
            carbs_consumed=0.0,
            fats_consumed=0.0,
            target_calories=float(target_cals),
            target_protein=float(target_prot),
            target_carbs=float(target_carbs),
            target_fats=float(target_fats),
            notes="",
            created_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(log)
        db.commit()
        db.refresh(log)

    return schemas.DailyNutritionLogOut.model_validate(log)


@router.post("/today", response_model=schemas.DailyNutritionLogOut)
def update_today_nutrition(
    payload: schemas.DailyNutritionLogUpdate,
    date_str: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Actualiza o incrementa el consumo de macros del día y sus objetivos."""
    target_date = dt.date.today()
    if date_str:
        try:
            target_date = dt.date.fromisoformat(date_str)
        except ValueError:
            pass

    log = (
        db.query(models.DailyNutritionLog)
        .filter(
            models.DailyNutritionLog.user_id == current_user.id,
            models.DailyNutritionLog.date == target_date,
        )
        .first()
    )

    if not log:
        log = models.DailyNutritionLog(
            user_id=current_user.id,
            date=target_date,
            created_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(log)

    if payload.calories_consumed is not None:
        log.calories_consumed = max(0.0, payload.calories_consumed)
    if payload.protein_consumed is not None:
        log.protein_consumed = max(0.0, payload.protein_consumed)
    if payload.carbs_consumed is not None:
        log.carbs_consumed = max(0.0, payload.carbs_consumed)
    if payload.fats_consumed is not None:
        log.fats_consumed = max(0.0, payload.fats_consumed)

    if payload.target_calories is not None:
        log.target_calories = max(0.0, payload.target_calories)
    if payload.target_protein is not None:
        log.target_protein = max(0.0, payload.target_protein)
    if payload.target_carbs is not None:
        log.target_carbs = max(0.0, payload.target_carbs)
    if payload.target_fats is not None:
        log.target_fats = max(0.0, payload.target_fats)

    if payload.notes is not None:
        log.notes = payload.notes

    db.commit()
    db.refresh(log)
    return schemas.DailyNutritionLogOut.model_validate(log)


# ====================================================================
# 2. PLAN DE COMIDAS & SUBIR PLAN DE NUTRICIONISTA (PDF)
# ====================================================================

@router.get("/plan", response_model=schemas.NutritionPlanOut)
def get_nutrition_plan(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Obtiene el plan de nutrición estructurado y notas del nutricionista."""
    plan = (
        db.query(models.NutritionPlan)
        .filter(models.NutritionPlan.user_id == current_user.id)
        .order_by(models.NutritionPlan.updated_at.desc(), models.NutritionPlan.id.desc())
        .first()
    )

    if not plan:
        default_meals = [
            {"meal_number": 1, "name": "Comida 1 (Desayuno)", "time": "08:00", "description": "4 huevos revueltos, 80g avena con leche o agua, 1 banana", "protein_g": 35, "carbs_g": 65, "fats_g": 20, "calories": 580},
            {"meal_number": 2, "name": "Comida 2 (Almuerzo)", "time": "13:00", "description": "200g pechuga de pollo / carne magra, 150g arroz blanco o patatas, ensalada verde y aceite de oliva", "protein_g": 48, "carbs_g": 55, "fats_g": 15, "calories": 550},
            {"meal_number": 3, "name": "Comida 3 (Pre-Entreno / Merienda)", "time": "17:00", "description": "1 scoop proteína de suero (whey), 2 rebanadas pan integral con mermelada o miel", "protein_g": 30, "carbs_g": 45, "fats_g": 4, "calories": 340},
            {"meal_number": 4, "name": "Comida 4 (Cena / Post-Entreno)", "time": "21:30", "description": "200g carne de ternera o pescado blanco, batata / boniato al horno, vegetales cocidos", "protein_g": 45, "carbs_g": 50, "fats_g": 14, "calories": 510},
        ]
        plan = models.NutritionPlan(
            user_id=current_user.id,
            title="Plan Nutricional Heavy Duty",
            notes="Dieta hipercalórica e hiperproteica limpia orientada al entrenamiento de alta intensidad.",
            meals_json=json.dumps(default_meals, ensure_ascii=False),
            created_at=dt.datetime.now(dt.timezone.utc),
            updated_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

    return schemas.NutritionPlanOut.model_validate(plan)


@router.post("/plan", response_model=schemas.NutritionPlanOut)
def update_nutrition_plan(
    payload: schemas.NutritionPlanUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Guarda o actualiza las notas y comidas ordenadas del plan."""
    plan = (
        db.query(models.NutritionPlan)
        .filter(models.NutritionPlan.user_id == current_user.id)
        .order_by(models.NutritionPlan.updated_at.desc(), models.NutritionPlan.id.desc())
        .first()
    )

    if not plan:
        plan = models.NutritionPlan(
            user_id=current_user.id,
            title=payload.title or "Plan Nutricional",
            notes=payload.notes,
            meals_json=payload.meals_json,
            created_at=dt.datetime.now(dt.timezone.utc),
            updated_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(plan)
    else:
        if payload.title is not None:
            plan.title = payload.title
        if payload.notes is not None:
            plan.notes = payload.notes
        if payload.meals_json is not None:
            plan.meals_json = payload.meals_json
        plan.updated_at = dt.datetime.now(dt.timezone.utc)

    db.commit()
    db.refresh(plan)
    return schemas.NutritionPlanOut.model_validate(plan)


@router.post("/upload-pdf", response_model=schemas.NutritionPlanOut)
async def upload_diet_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Carga el PDF del plan del nutricionista y lo asocia al plan del usuario."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un documento PDF (.pdf)",
        )

    # Limpiar nombre y guardar
    safe_name = f"user_{current_user.id}_{int(dt.datetime.now().timestamp())}_{file.filename}"
    file_path = UPLOADS_DIR / safe_name

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    plan = (
        db.query(models.NutritionPlan)
        .filter(models.NutritionPlan.user_id == current_user.id)
        .order_by(models.NutritionPlan.updated_at.desc(), models.NutritionPlan.id.desc())
        .first()
    )

    pdf_url = f"/api/nutrition/download-pdf/{safe_name}"

    if not plan:
        plan = models.NutritionPlan(
            user_id=current_user.id,
            title="Plan Nutricionista",
            pdf_filename=file.filename,
            pdf_url=pdf_url,
            created_at=dt.datetime.now(dt.timezone.utc),
            updated_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(plan)
    else:
        plan.pdf_filename = file.filename
        plan.pdf_url = pdf_url
        plan.updated_at = dt.datetime.now(dt.timezone.utc)

    db.commit()
    db.refresh(plan)
    return schemas.NutritionPlanOut.model_validate(plan)


@router.get("/download-pdf/{filename}")
def download_pdf(
    filename: str,
    current_user: models.User = Depends(get_current_user),
):
    """Descarga o visualiza el PDF de la dieta."""
    # Validación básica de seguridad contra directory traversal
    safe_filename = Path(filename).name
    file_path = UPLOADS_DIR / safe_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo PDF no encontrado.")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=safe_filename,
    )
