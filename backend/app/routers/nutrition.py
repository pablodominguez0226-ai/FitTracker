import datetime as dt
import json
import os
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func
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
        # Superávit calórico controlado (Alta Intensidad / Masa magra)
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
            title="Plan Nutricional Alta Intensidad",
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


# ====================================================================
# 3. BASE NUTRICIONAL ARGENTINA & BUSCADOR PREDICTIVO
# ====================================================================

@router.get("/foods", response_model=list[schemas.FoodItemOut])
def get_foods(
    q: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Buscador predictivo rápido de alimentos e ingredientes con filtro por categoría."""
    query = db.query(models.FoodItem)
    if category and category != "all":
        query = query.filter(models.FoodItem.category == category)
    if q and q.strip():
        search_pattern = f"%{q.strip().lower()}%"
        query = query.filter(func.lower(models.FoodItem.name).like(search_pattern))

    return [schemas.FoodItemOut.model_validate(f) for f in query.order_by(models.FoodItem.name.asc()).limit(200).all()]


# ====================================================================
# 4. COMIDAS CASERAS Y RECETAS DEL USUARIO
# ====================================================================

@router.post("/custom-recipe", response_model=schemas.CustomRecipeOut)
def create_custom_recipe(
    payload: schemas.CustomRecipeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Crea una comida combinada calculando los macros proporcionales automáticamente
    a partir de sus ingredientes y gramos.
    """
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="El nombre de la receta es requerido.")
    if not payload.ingredients:
        raise HTTPException(status_code=400, detail="Debe incluir al menos un ingrediente.")
    if payload.total_weight_g <= 0:
        raise HTTPException(status_code=400, detail="El peso por unidad/porción debe ser mayor a 0.")

    # Cache de alimentos para cálculo
    food_ids = [ing.food_id for ing in payload.ingredients if ing.food_id]
    db_foods = {f.id: f for f in db.query(models.FoodItem).filter(models.FoodItem.id.in_(food_ids)).all()} if food_ids else {}

    total_batch_grams = 0.0
    total_batch_cals = 0.0
    total_batch_prot = 0.0
    total_batch_carbs = 0.0
    total_batch_fat = 0.0

    ingredients_data = []

    for ing in payload.ingredients:
        grams = max(0.0, float(ing.grams))
        total_batch_grams += grams
        food = db_foods.get(ing.food_id) if ing.food_id else None

        if food:
            cals_100 = food.calories_100g
            prot_100 = food.protein_100g
            carbs_100 = food.carbs_100g
            fat_100 = food.fat_100g
        else:
            cals_100 = (ing.calories / grams * 100.0) if ing.calories and grams > 0 else 0.0
            prot_100 = (ing.protein / grams * 100.0) if ing.protein and grams > 0 else 0.0
            carbs_100 = (ing.carbs / grams * 100.0) if ing.carbs and grams > 0 else 0.0
            fat_100 = (ing.fat / grams * 100.0) if ing.fat and grams > 0 else 0.0

        item_cals = round(grams * (cals_100 / 100.0), 2)
        item_prot = round(grams * (prot_100 / 100.0), 2)
        item_carbs = round(grams * (carbs_100 / 100.0), 2)
        item_fat = round(grams * (fat_100 / 100.0), 2)

        total_batch_cals += item_cals
        total_batch_prot += item_prot
        total_batch_carbs += item_carbs
        total_batch_fat += item_fat

        ingredients_data.append({
            "food_id": ing.food_id,
            "name": ing.name,
            "grams": grams,
            "calories": item_cals,
            "protein": item_prot,
            "carbs": item_carbs,
            "fat": item_fat,
        })

    # Proporción según el peso de la porción / unidad especificado
    ratio = (payload.total_weight_g / total_batch_grams) if total_batch_grams > 0 else 1.0

    calc_calories = round(payload.calculated_calories if payload.calculated_calories is not None else (total_batch_cals * ratio), 1)
    calc_protein = round(payload.calculated_protein if payload.calculated_protein is not None else (total_batch_prot * ratio), 1)
    calc_carbs = round(payload.calculated_carbs if payload.calculated_carbs is not None else (total_batch_carbs * ratio), 1)
    calc_fat = round(payload.calculated_fat if payload.calculated_fat is not None else (total_batch_fat * ratio), 1)

    recipe = models.CustomRecipe(
        user_id=current_user.id,
        name=payload.name.strip(),
        total_weight_g=float(payload.total_weight_g),
        ingredients_json=json.dumps(ingredients_data, ensure_ascii=False),
        calculated_calories=calc_calories,
        calculated_protein=calc_protein,
        calculated_carbs=calc_carbs,
        calculated_fat=calc_fat,
        servings=max(1, payload.servings),
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    return schemas.CustomRecipeOut.model_validate(recipe)


@router.get("/custom-recipes", response_model=list[schemas.CustomRecipeOut])
def get_custom_recipes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Lista las recetas y comidas caseras creadas por el usuario."""
    recipes = (
        db.query(models.CustomRecipe)
        .filter(models.CustomRecipe.user_id == current_user.id)
        .order_by(models.CustomRecipe.created_at.desc(), models.CustomRecipe.id.desc())
        .all()
    )
    return [schemas.CustomRecipeOut.model_validate(r) for r in recipes]


@router.delete("/custom-recipes/{recipe_id}")
def delete_custom_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Elimina una receta casera creada por el usuario."""
    recipe = (
        db.query(models.CustomRecipe)
        .filter(models.CustomRecipe.id == recipe_id, models.CustomRecipe.user_id == current_user.id)
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada.")
    db.delete(recipe)
    db.commit()
    return {"status": "ok", "deleted_id": recipe_id}


# ====================================================================
# 5. REGISTRO DE COMIDAS DIARIAS (CON ACOMPAÑAMIENTOS Y EXTRAS)
# ====================================================================

@router.post("/log", response_model=schemas.DailyFoodLogOut)
def log_food(
    payload: schemas.FoodLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Registra un plato o comida con sus modificadores/guarniciones
    y actualiza automáticamente el acumulado diario de nutrición.
    """
    target_date = payload.log_date or dt.date.today()

    food_log = models.DailyFoodLog(
        user_id=current_user.id,
        food_name=payload.food_name.strip(),
        grams_or_units=payload.grams_or_units,
        calories=round(payload.calories, 1),
        protein=round(payload.protein, 1),
        carbs=round(payload.carbs, 1),
        fat=round(payload.fat, 1),
        log_date=target_date,
        side_dish_name=payload.side_dish_name.strip() if payload.side_dish_name else None,
        side_dish_grams=payload.side_dish_grams,
        meal_type=payload.meal_type or "comida",
        recipe_id=payload.recipe_id,
        food_id=payload.food_id,
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(food_log)

    # Actualizar o inicializar el acumulado en daily_nutrition_logs
    daily_nutri = (
        db.query(models.DailyNutritionLog)
        .filter(
            models.DailyNutritionLog.user_id == current_user.id,
            models.DailyNutritionLog.date == target_date,
        )
        .first()
    )

    if not daily_nutri:
        bw = current_user.bodyweight or 75.0
        target_prot = current_user.target_protein_g or round(bw * 2.2, 1)
        target_fats = round(bw * 0.9, 1)
        target_cals = round(bw * 34, 0)
        target_carbs = round(max(0, target_cals - (target_prot * 4 + target_fats * 9)) / 4, 1)

        daily_nutri = models.DailyNutritionLog(
            user_id=current_user.id,
            date=target_date,
            calories_consumed=round(payload.calories, 1),
            protein_consumed=round(payload.protein, 1),
            carbs_consumed=round(payload.carbs, 1),
            fats_consumed=round(payload.fat, 1),
            target_calories=float(target_cals),
            target_protein=float(target_prot),
            target_carbs=float(target_carbs),
            target_fats=float(target_fats),
            notes="",
            created_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(daily_nutri)
    else:
        daily_nutri.calories_consumed = round(daily_nutri.calories_consumed + payload.calories, 1)
        daily_nutri.protein_consumed = round(daily_nutri.protein_consumed + payload.protein, 1)
        daily_nutri.carbs_consumed = round(daily_nutri.carbs_consumed + payload.carbs, 1)
        daily_nutri.fats_consumed = round(daily_nutri.fats_consumed + payload.fat, 1)

    db.commit()
    db.refresh(food_log)
    return schemas.DailyFoodLogOut.model_validate(food_log)


@router.get("/logs", response_model=list[schemas.DailyFoodLogOut])
def get_food_logs(
    date_str: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Obtiene los platos registrados para la fecha especificada."""
    target_date = dt.date.today()
    if date_str:
        try:
            target_date = dt.date.fromisoformat(date_str)
        except ValueError:
            pass

    logs = (
        db.query(models.DailyFoodLog)
        .filter(
            models.DailyFoodLog.user_id == current_user.id,
            models.DailyFoodLog.log_date == target_date,
        )
        .order_by(models.DailyFoodLog.created_at.asc(), models.DailyFoodLog.id.asc())
        .all()
    )
    return [schemas.DailyFoodLogOut.model_validate(l) for l in logs]


@router.delete("/logs/{log_id}")
def delete_food_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Elimina un plato registrado y descuenta sus macros del progreso diario."""
    log = (
        db.query(models.DailyFoodLog)
        .filter(models.DailyFoodLog.id == log_id, models.DailyFoodLog.user_id == current_user.id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Registro de comida no encontrado.")

    # Restar de daily_nutrition_logs
    daily_nutri = (
        db.query(models.DailyNutritionLog)
        .filter(
            models.DailyNutritionLog.user_id == current_user.id,
            models.DailyNutritionLog.date == log.log_date,
        )
        .first()
    )
    if daily_nutri:
        daily_nutri.calories_consumed = max(0.0, round(daily_nutri.calories_consumed - log.calories, 1))
        daily_nutri.protein_consumed = max(0.0, round(daily_nutri.protein_consumed - log.protein, 1))
        daily_nutri.carbs_consumed = max(0.0, round(daily_nutri.carbs_consumed - log.carbs, 1))
        daily_nutri.fats_consumed = max(0.0, round(daily_nutri.fats_consumed - log.fat, 1))

    db.delete(log)
    db.commit()
    return {"status": "ok", "deleted_id": log_id}
