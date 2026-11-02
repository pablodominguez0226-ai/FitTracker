import datetime as dt
import re
import unicodedata
from difflib import SequenceMatcher
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..security import get_optional_current_user

router = APIRouter()

SPANISH_STOPWORDS = {
    "de", "del", "en", "con", "al", "la", "el", "los", "las",
    "un", "una", "unos", "unas", "para", "por", "a", "y", "o", "u", "se", "su",
}


def _normalize_text(text: str) -> str:
    if not text:
        return ""
    norm = unicodedata.normalize("NFD", text.lower().strip())
    no_accents = "".join(ch for ch in norm if unicodedata.category(ch) != "Mn")
    cleaned = re.sub(r"[^a-z0-9\s]", " ", no_accents)
    return re.sub(r"\s+", " ", cleaned).strip()


def _stem_token(tok: str) -> str:
    if len(tok) > 5 and tok.endswith("iones"):
        return tok[:-3]  # extensiones -> extension
    if len(tok) > 4 and tok.endswith("es") and not tok.endswith("ps"):
        return tok[:-2]
    if len(tok) > 3 and tok.endswith("s"):
        return tok[:-1]
    return tok


def _tokenize_exercise(text: str) -> list[str]:
    norm = _normalize_text(text)
    if not norm:
        return []
    tokens = []
    for raw in norm.split(" "):
        if not raw or raw in SPANISH_STOPWORDS or len(raw) < 2:
            continue
        tokens.append(_stem_token(raw))
    return tokens


def _get_user_exercise_usage_60d(db: Session, user_id: int | None, days: int = 60) -> dict[int, int]:
    cutoff = dt.date.today() - dt.timedelta(days=days)
    query = (
        db.query(
            models.WorkoutSet.exercise_id,
            func.count(func.distinct(models.WorkoutSession.id)).label("session_cnt"),
            func.count(models.WorkoutSet.id).label("set_cnt"),
        )
        .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSet.completed == True,
            models.WorkoutSession.date >= cutoff,
        )
    )
    if user_id is not None:
        query = query.filter(models.WorkoutSession.user_id == user_id)

    rows = query.group_by(models.WorkoutSet.exercise_id).all()
    if not rows and user_id is not None:
        # Fallback a todo el historial del usuario si no entrenó en los últimos 60 días
        fallback_q = (
            db.query(
                models.WorkoutSet.exercise_id,
                func.count(func.distinct(models.WorkoutSession.id)).label("session_cnt"),
                func.count(models.WorkoutSet.id).label("set_cnt"),
            )
            .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
            .filter(
                models.WorkoutSet.completed == True,
                models.WorkoutSession.user_id == user_id,
            )
            .group_by(models.WorkoutSet.exercise_id)
        )
        rows = fallback_q.all()

    usage_map: dict[int, int] = {}
    for ex_id, session_cnt, set_cnt in rows:
        if ex_id is not None:
            # Guardamos cantidad de veces (series efectivas o sesiones ponderadas)
            usage_map[int(ex_id)] = int(set_cnt or session_cnt or 0)
    return usage_map


def _to_exercise_out(ex: models.Exercise, usage_count: int = 0) -> schemas.ExerciseOut:
    mg_name = ex.muscle_group.name if ex.muscle_group else None
    subgroup = ex.subgroup or ex.primary_muscles
    return schemas.ExerciseOut(
        id=ex.id,
        slug=ex.slug,
        name=ex.name,
        muscle_group_id=ex.muscle_group_id,
        muscle_group_name=mg_name,
        muscleGroup=mg_name,
        subgroup=subgroup,
        mediaUrl=ex.image_url,
        target_muscle=mg_name,
        category=ex.mechanics_type,
        secondary_muscles=subgroup,
        is_active=ex.is_active,
        execution_tips=ex.execution_tips,
        target_tempo=ex.target_tempo,
        primary_muscles=subgroup,
        equipment_type=None,
        mechanics_type=ex.mechanics_type,
        image_url=ex.image_url,
        key_cue=ex.key_cue,
        replacement_id=ex.replacement_id,
        usage_count_60d=usage_count,
    )


def _matches_muscle_filter(ex: models.Exercise, muscle_filter: str) -> bool:
    norm_filter = _normalize_text(muscle_filter)
    if not norm_filter or norm_filter in ("all", "todos", "todos los musculos"):
        return True
    if norm_filter.isdigit():
        return ex.muscle_group_id == int(norm_filter)

    mg_norm = _normalize_text(ex.muscle_group.name if ex.muscle_group else "")
    sub_norm = _normalize_text(ex.subgroup or ex.primary_muscles or "")
    name_norm = _normalize_text(ex.name or "")

    # Coincidencia directa con el grupo muscular principal o subgrupo
    if (
        norm_filter == mg_norm
        or norm_filter.rstrip("s") == mg_norm.rstrip("s")
        or norm_filter == sub_norm
        or norm_filter.rstrip("s") == sub_norm.rstrip("s")
    ):
        return True

    # Sinónimos directos de grupos musculares principales
    synonyms_map = {
        "pecho": {"pecho", "pectoral", "pectorales"},
        "espalda": {"espalda", "lats", "dorsal", "dorsales", "columna", "columna vertebral"},
        "brazos": {"brazo", "brazos"},
        "piernas": {"pierna", "piernas"},
    }
    for group_key, aliases in synonyms_map.items():
        if norm_filter in aliases and (mg_norm == group_key or mg_norm.rstrip("s") == group_key.rstrip("s")):
            return True

    # Sub-grupos anatómicos específicos
    submuscle_keywords = {
        "hombros": ["hombro", "deltoide"],
        "hombro": ["hombro", "deltoide"],
        "biceps": ["bicep", "biceps", "braquial"],
        "triceps": ["tricep", "triceps"],
        "cuadriceps": ["cuadriceps", "sentadilla", "prensa", "hack", "sissy"],
        "isquios": ["isquio", "femoral", "peso muerto rumano", "buenos dias", "nordic"],
        "isquiotibiales": ["isquio", "femoral", "peso muerto rumano", "buenos dias", "nordic"],
        "femoral": ["isquio", "femoral", "peso muerto rumano", "buenos dias", "nordic"],
        "gemelos": ["gemelo", "talon", "soleo", "pantorrilla"],
        "gluteos": ["gluteo", "hip thrust", "puente", "abductor", "abduccion", "patada", "bulgara", "zancada"],
        "aductores": ["aductor", "aduccion", "sumo"],
        "antebrazos": ["antebrazo", "muneca", "inverso", "pronacion", "martillo", "farmer"],
        "serrato": ["serrato", "pullover"],
        "columna": ["lumbar", "hiperextension", "peso muerto", "buenos dias", "espinal", "cadena posterior"],
    }
    if norm_filter in submuscle_keywords:
        for kw in submuscle_keywords[norm_filter]:
            if kw in sub_norm or kw in name_norm:
                return True

    return norm_filter in mg_norm or norm_filter in sub_norm


@router.get("", response_model=list[schemas.ExerciseOut])
def list_exercises(
    muscle: str | None = Query(None, description="Filtrar por grupo muscular (ej: pecho, espalda, triceps)"),
    q: str | None = Query(None, description="Búsqueda por texto en el nombre del ejercicio"),
    muscle_group_id: int | None = Query(None, description="Filtrar por ID de grupo muscular"),
    include_archived: bool = Query(False, description="Incluir ejercicios archivados"),
    limit: int | None = Query(None, description="Límite opcional de resultados"),
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Exercise).options(joinedload(models.Exercise.muscle_group))
    if not include_archived:
        query = query.filter(models.Exercise.is_active == True)
    if muscle_group_id is not None:
        query = query.filter(models.Exercise.muscle_group_id == muscle_group_id)
    query = query.order_by(models.Exercise.name.asc())
    exercises = query.all()

    if muscle is not None and muscle.strip():
        exercises = [ex for ex in exercises if _matches_muscle_filter(ex, muscle)]

    if q is not None and q.strip():
        q_norm = _normalize_text(q)
        if q_norm:
            exercises = [
                ex
                for ex in exercises
                if q_norm in _normalize_text(ex.name)
                or q_norm in _normalize_text(ex.muscle_group.name if ex.muscle_group else "")
                or q_norm in _normalize_text(ex.subgroup or ex.primary_muscles or "")
            ]

    if limit is not None:
        exercises = exercises[:limit]

    user_id = current_user.id if current_user else None
    usage_map = _get_user_exercise_usage_60d(db, user_id, days=60)

    return [_to_exercise_out(ex, usage_map.get(ex.id, 0)) for ex in exercises]


@router.get("/frequent", response_model=list[schemas.ExerciseOut])
def get_frequent_exercises(
    days: int = Query(60, ge=1, le=365, description="Ventana de días para frecuencia"),
    limit: int = Query(15, ge=1, le=50, description="Máximo de ejercicios frecuentes"),
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.id if current_user else None
    usage_map = _get_user_exercise_usage_60d(db, user_id, days=days)
    if not usage_map:
        return []

    top_ids = sorted(usage_map.keys(), key=lambda eid: usage_map[eid], reverse=True)[:limit]
    exercises = (
        db.query(models.Exercise)
        .options(joinedload(models.Exercise.muscle_group))
        .filter(
            models.Exercise.id.in_(top_ids),
            models.Exercise.is_active == True,
        )
        .all()
    )
    ex_by_id = {ex.id: ex for ex in exercises}
    result = []
    for eid in top_ids:
        ex = ex_by_id.get(eid)
        if not ex:
            continue
        result.append(_to_exercise_out(ex, usage_map.get(ex.id, 0)))
    return result


@router.get("/similar", response_model=list[schemas.SimilarExerciseItem])
def find_similar_exercises(
    name: str = Query(..., min_length=2, description="Nombre del ejercicio a verificar"),
    muscle_group_id: int | None = Query(None, description="ID del grupo muscular"),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    clean_input = _normalize_text(name)
    if not clean_input or len(clean_input) < 2:
        return []

    input_tokens = set(_tokenize_exercise(name))

    query = db.query(models.Exercise).options(joinedload(models.Exercise.muscle_group)).filter(models.Exercise.is_active == True)
    candidates = query.all()

    scored: list[schemas.SimilarExerciseItem] = []

    for ex in candidates:
        cand_norm = _normalize_text(ex.name)
        if not cand_norm:
            continue

        # Exact match
        if cand_norm == clean_input:
            scored.append(
                schemas.SimilarExerciseItem(
                    id=ex.id,
                    name=ex.name,
                    muscle_group_id=ex.muscle_group_id,
                    muscle_group_name=ex.muscle_group.name if ex.muscle_group else None,
                    equipment_type=None,
                    mechanics_type=ex.mechanics_type,
                    similarity_score=1.0,
                )
            )
            continue

        cand_tokens = set(_tokenize_exercise(ex.name))
        if not cand_tokens or not input_tokens:
            continue

        common_tokens = input_tokens.intersection(cand_tokens)
        overlap_count = len(common_tokens)

        # Cobertura de tokens del candidato y del input
        cand_coverage = overlap_count / max(len(cand_tokens), 1)
        input_coverage = overlap_count / max(len(input_tokens), 1)
        jaccard = overlap_count / max(len(input_tokens.union(cand_tokens)), 1)
        seq_ratio = SequenceMatcher(None, clean_input, cand_norm).ratio()

        # Substring boost
        substring_boost = 0.25 if (clean_input in cand_norm or cand_norm in clean_input) else 0.0

        # Muscle group boost
        mg_boost = 0.0
        if muscle_group_id is not None:
            if ex.muscle_group_id == muscle_group_id:
                mg_boost = 0.12
            else:
                mg_boost = -0.15

        score = (
            max(cand_coverage * 0.65 + input_coverage * 0.35, jaccard, seq_ratio * 0.85)
            + substring_boost
            + mg_boost
        )

        is_relevant = (
            (overlap_count >= 2 and score >= 0.52)
            or (overlap_count >= 1 and len(cand_tokens) <= 2 and score >= 0.62)
            or (seq_ratio >= 0.72)
            or (substring_boost > 0 and len(clean_input) >= 4)
        )
        if muscle_group_id is not None and ex.muscle_group_id != muscle_group_id and score < 0.72:
            is_relevant = False

        if is_relevant:
            scored.append(
                schemas.SimilarExerciseItem(
                    id=ex.id,
                    name=ex.name,
                    muscle_group_id=ex.muscle_group_id,
                    muscle_group_name=ex.muscle_group.name if ex.muscle_group else None,
                    equipment_type=None,
                    mechanics_type=ex.mechanics_type,
                    similarity_score=round(min(score, 0.99), 3),
                )
            )

    scored.sort(key=lambda item: item.similarity_score, reverse=True)
    return scored[:limit]


@router.post("", response_model=schemas.ExerciseOut)
def create_exercise(payload: schemas.ExerciseCreate, db: Session = Depends(get_db)):
    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="El nombre del ejercicio no puede estar vacío.")

    group = db.get(models.MuscleGroup, payload.muscle_group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupo muscular no encontrado.")

    existing = (
        db.query(models.Exercise)
        .filter(
            models.Exercise.muscle_group_id == payload.muscle_group_id,
            func.lower(models.Exercise.name) == clean_name.lower()
        )
        .first()
    )
    if existing:
        if not existing.is_active:
            existing.is_active = True
        if payload.slug is not None:
            existing.slug = payload.slug
        if payload.subgroup is not None:
            existing.subgroup = payload.subgroup
            existing.primary_muscles = payload.subgroup
        if payload.execution_tips is not None:
            existing.execution_tips = payload.execution_tips
        if payload.target_tempo is not None:
            existing.target_tempo = payload.target_tempo
        if payload.primary_muscles is not None:
            existing.primary_muscles = payload.primary_muscles
        existing.equipment_type = None
        if payload.mechanics_type is not None:
            existing.mechanics_type = payload.mechanics_type
        if payload.mediaUrl is not None:
            existing.image_url = payload.mediaUrl
        elif payload.image_url is not None:
            existing.image_url = payload.image_url
        if payload.key_cue is not None:
            existing.key_cue = payload.key_cue
        if payload.replacement_id is not None:
            existing.replacement_id = payload.replacement_id
        db.commit()
        db.refresh(existing)
        return _to_exercise_out(existing)

    exercise = models.Exercise(
        slug=payload.slug,
        name=clean_name,
        subgroup=payload.subgroup or payload.primary_muscles or group.name,
        muscle_group_id=payload.muscle_group_id,
        is_active=True,
        execution_tips=payload.execution_tips,
        target_tempo=payload.target_tempo,
        primary_muscles=payload.primary_muscles or payload.subgroup or group.name,
        equipment_type=None,
        mechanics_type=payload.mechanics_type or "compuesto",
        image_url=payload.mediaUrl or payload.image_url,
        key_cue=payload.key_cue,
        replacement_id=payload.replacement_id,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return _to_exercise_out(exercise)


@router.get("/{exercise_id}/guide", response_model=schemas.ExerciseGuideOut)
def get_exercise_guide(
    exercise_id: int,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    exercise = (
        db.query(models.Exercise)
        .options(joinedload(models.Exercise.muscle_group))
        .filter(models.Exercise.id == exercise_id)
        .first()
    )
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    level = "estándar"

    mg_name = exercise.muscle_group.name if exercise.muscle_group else "General"

    raw_tips = exercise.execution_tips or ""
    tempo = exercise.target_tempo or "3-0-1-0 (3s bajada / 1s subida)"
    muscles = exercise.primary_muscles or (f"{mg_name}, estabilizadores sinergistas")

    # Extract bullet points
    lines = [line.strip().lstrip("•-* ").strip() for line in raw_tips.split("\n") if line.strip()]

    setup = None
    execution = None
    breathing = None

    for line in lines:
        lower = line.lower()
        if lower.startswith("setup:") or lower.startswith("preparación:"):
            setup = line.split(":", 1)[1].strip()
        elif lower.startswith("ejecución:") or lower.startswith("movimiento:"):
            execution = line.split(":", 1)[1].strip()
        elif lower.startswith("respiración:") or lower.startswith("aire:"):
            breathing = line.split(":", 1)[1].strip()

    # Fallback to lines if prefixes weren't used
    if not setup and len(lines) > 0:
        setup = lines[0]
    if not execution and len(lines) > 1:
        execution = lines[1]
    if not breathing and len(lines) > 2:
        breathing = lines[2]

    # Default biomechanical points if none found
    if not setup:
        setup = "Postura estable, base firme y anclaje escapular o de cadera antes de iniciar."
    if not execution:
        execution = "Fase concéntrica acelerada y fase excéntrica estricta (3s) sin rebotes articulares."
    if not breathing:
        breathing = "Inhalación diafragmática en la fase excéntrica; exhalar superando el punto de estancamiento."

    key_points = [
        f"Setup: {setup}",
        f"Ejecución: {execution}",
        f"Respiración: {breathing}",
    ]

    level_rec = "Asegurá tensión mecánica continua en todo el rango completo, aceleración concéntrica controlando la fase excéntrica (3s) y manteniendo RIR 1-2."


    return schemas.ExerciseGuideOut(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        muscle_group_name=mg_name,
        primary_muscles=muscles,
        target_tempo=tempo,
        execution_tips=raw_tips or "\n".join(f"• {kp}" for kp in key_points),
        key_points=key_points,
        setup=setup,
        execution=execution,
        breathing=breathing,
        user_level=level,
        level_recommendation=level_rec,
    )


@router.get("/{exercise_id}/last-performance", response_model=schemas.ExerciseLastPerformanceOut)
def get_exercise_last_performance(
    exercise_id: int,
    exclude_session_id: int | None = Query(None, description="ID de sesión a excluir (ej. sesión en progreso)"),
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Devuelve la combinación más representativa (serie más pesada con sus reps y series totales)
    de la última sesión en que se ejecutó el ejercicio.
    """
    exercise = db.get(models.Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    query = (
        db.query(models.WorkoutSession)
        .join(models.WorkoutSet, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSet.exercise_id == exercise_id,
            (models.WorkoutSession.status == "completed") | (models.WorkoutSession.is_completed == True),
        )
    )
    if current_user is not None:
        query = query.filter(models.WorkoutSession.user_id == current_user.id)
    if exclude_session_id is not None:
        query = query.filter(models.WorkoutSession.id != exclude_session_id)

    last_session = query.order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc()).first()

    # Fallback: si no hay sesión marcada como completed, buscar la última sesión previa con series completadas
    if not last_session:
        fb_query = (
            db.query(models.WorkoutSession)
            .join(models.WorkoutSet, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
            .filter(
                models.WorkoutSet.exercise_id == exercise_id,
                models.WorkoutSet.completed == True,
            )
        )
        if current_user is not None:
            fb_query = fb_query.filter(models.WorkoutSession.user_id == current_user.id)
        if exclude_session_id is not None:
            fb_query = fb_query.filter(models.WorkoutSession.id != exclude_session_id)
        last_session = fb_query.order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc()).first()

    if not last_session:
        return schemas.ExerciseLastPerformanceOut(
            exercise_id=exercise.id,
            exercise_name=exercise.name,
            has_previous=False,
        )

    sets = (
        db.query(models.WorkoutSet)
        .filter(
            models.WorkoutSet.workout_session_id == last_session.id,
            models.WorkoutSet.exercise_id == exercise_id,
        )
        .order_by(models.WorkoutSet.set_number.asc(), models.WorkoutSet.id.asc())
        .all()
    )

    working_sets = [
        s for s in sets
        if s.completed and (s.set_type or "normal").lower() not in ["warmup", "w"]
    ]
    if not working_sets:
        working_sets = [s for s in sets if s.completed] or sets

    if not working_sets:
        return schemas.ExerciseLastPerformanceOut(
            exercise_id=exercise.id,
            exercise_name=exercise.name,
            has_previous=False,
        )

    sets_count = len(working_sets)
    best_set = max(working_sets, key=lambda s: (float(s.weight or 0.0), int(s.reps or 0)))
    rep_weight = round(float(best_set.weight or 0.0), 1)
    rep_reps = int(best_set.reps or 0)
    max_reps = max((int(s.reps or 0) for s in working_sets), default=rep_reps)
    total_volume = round(sum((float(s.weight or 0.0) * int(s.reps or 0)) for s in working_sets), 1)

    weight_str = f"{int(rep_weight)}" if rep_weight == int(rep_weight) else f"{rep_weight}"
    formatted_summary = f"{sets_count}×{rep_reps} @ {weight_str} kg"

    return schemas.ExerciseLastPerformanceOut(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        has_previous=True,
        session_id=last_session.id,
        date=last_session.date,
        sets_count=sets_count,
        reps=rep_reps,
        weight=rep_weight,
        max_weight=rep_weight,
        max_reps=max_reps,
        total_volume=total_volume,
        formatted_summary=formatted_summary,
        sets=[
            schemas.PreviousSessionSetOut(
                set_number=s.set_number,
                weight=float(s.weight or 0.0),
                reps=int(s.reps or 0),
                completed=bool(s.completed),
            )
            for s in sets
        ],
    )


@router.get("/{exercise_id}/previous-session", response_model=schemas.PreviousExerciseSessionOut | None)
def get_previous_session_for_exercise(
    exercise_id: int,
    exclude_session_id: int | None = Query(None, description="ID de sesión a excluir (ej. sesión en progreso)"),
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    exercise = db.get(models.Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    # Find the most recent COMPLETED workout session that has sets for this exercise
    query = (
        db.query(models.WorkoutSession)
        .join(models.WorkoutSet, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSet.exercise_id == exercise_id,
            models.WorkoutSession.status == "completed",
        )
    )
    if current_user is not None:
        query = query.filter(models.WorkoutSession.user_id == current_user.id)
    if exclude_session_id is not None:
        query = query.filter(models.WorkoutSession.id != exclude_session_id)

    last_session = query.order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc()).first()
    if not last_session:
        return None

    sets = (
        db.query(models.WorkoutSet)
        .filter(
            models.WorkoutSet.workout_session_id == last_session.id,
            models.WorkoutSet.exercise_id == exercise_id,
        )
        .order_by(models.WorkoutSet.set_number.asc(), models.WorkoutSet.id.asc())
        .all()
    )

    total_volume = sum((s.weight * s.reps) for s in sets if s.completed)
    if total_volume == 0 and sets:
        total_volume = sum((s.weight * s.reps) for s in sets)

    return schemas.PreviousExerciseSessionOut(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        session_id=last_session.id,
        date=last_session.date,
        total_volume=round(total_volume, 1),
        sets=[
            schemas.PreviousSessionSetOut(
                set_number=s.set_number,
                weight=s.weight,
                reps=s.reps,
                completed=s.completed,
            )
            for s in sets
        ],
    )


@router.delete("/{exercise_id}")
def delete_exercise(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.get(models.Exercise, exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    # Check if there are historical sets recorded with this exercise
    has_sets = (
        db.query(models.WorkoutSet)
        .filter(models.WorkoutSet.exercise_id == exercise_id)
        .first()
    )
    if has_sets:
        # Soft delete: archive the exercise without wiping historical sets
        exercise.is_active = False
        db.commit()
        return {
            "deleted": True,
            "archived": True,
            "message": "Ejercicio archivado. Tu historial de series previas se mantiene intacto.",
        }

    # Clean references before full deletion
    db.query(models.Exercise).filter(models.Exercise.replacement_id == exercise_id).update({"replacement_id": None})
    db.query(models.RoutineExercise).filter(models.RoutineExercise.exercise_id == exercise_id).delete()
    db.query(models.LiveBattle).filter(models.LiveBattle.exercise_id == exercise_id).delete()

    db.delete(exercise)
    db.commit()
    return {"deleted": True, "archived": False, "message": "Ejercicio eliminado exitosamente."}


@router.put("/{exercise_id}", response_model=schemas.ExerciseOut)
@router.patch("/{exercise_id}", response_model=schemas.ExerciseOut)
def update_exercise(
    exercise_id: int,
    payload: schemas.ExerciseUpdate,
    db: Session = Depends(get_db)
):
    exercise = (
        db.query(models.Exercise)
        .options(joinedload(models.Exercise.muscle_group))
        .filter(models.Exercise.id == exercise_id)
        .first()
    )
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    if payload.name is not None:
        clean_name = payload.name.strip()
        if clean_name:
            exercise.name = clean_name
    if payload.muscle_group_id is not None:
        group = db.get(models.MuscleGroup, payload.muscle_group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Grupo muscular no encontrado.")
        exercise.muscle_group_id = payload.muscle_group_id
    if payload.slug is not None:
        exercise.slug = payload.slug
    if payload.subgroup is not None:
        exercise.subgroup = payload.subgroup
        exercise.primary_muscles = payload.subgroup
    if payload.execution_tips is not None:
        exercise.execution_tips = payload.execution_tips
    if payload.target_tempo is not None:
        exercise.target_tempo = payload.target_tempo
    if payload.primary_muscles is not None:
        exercise.primary_muscles = payload.primary_muscles
    exercise.equipment_type = None
    if payload.mechanics_type is not None:
        exercise.mechanics_type = payload.mechanics_type
    if payload.mediaUrl is not None:
        exercise.image_url = payload.mediaUrl.strip() if payload.mediaUrl else None
    elif payload.image_url is not None:
        exercise.image_url = payload.image_url.strip() if payload.image_url else None
    if payload.key_cue is not None:
        exercise.key_cue = payload.key_cue
    if payload.replacement_id is not None:
        exercise.replacement_id = payload.replacement_id

    db.commit()
    db.refresh(exercise)

    return _to_exercise_out(exercise)



@router.get("/{exercise_id}/guidance", response_model=schemas.ExerciseGuidanceOut)
def get_exercise_guidance(
    exercise_id: int,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna analítica de guía para el ejercicio:
    - 1RM previo estimado (Epley y Brzycki) a partir del historial real de series
    - Meta sugerida para hoy según sobrecarga progresiva (+2.5 kg o +1 rep) o descarga (-30% si fatiga detectada)
    - Ejercicio sustituto directo equivalente del mismo grupo muscular
    """
    from ..services.biometrics import (
        calculate_1rm_epley,
        calculate_1rm_brzycki,
        calculate_progressive_overload_guidance,
    )

    exercise = (
        db.query(models.Exercise)
        .options(
            joinedload(models.Exercise.muscle_group),
            joinedload(models.Exercise.replacement).joinedload(models.Exercise.muscle_group)
        )
        .filter(models.Exercise.id == exercise_id)
        .first()
    )
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    # 1. Sustituto directo o alternativa por mismo grupo muscular
    substitute_out = None
    sub_ex = exercise.replacement
    if not sub_ex and exercise.replacement_id:
        sub_ex = db.get(models.Exercise, exercise.replacement_id)

    if not sub_ex and exercise.muscle_group_id:
        sub_ex = (
            db.query(models.Exercise)
            .filter(
                models.Exercise.muscle_group_id == exercise.muscle_group_id,
                models.Exercise.id != exercise.id,
                models.Exercise.is_active == True,
            )
            .order_by(models.Exercise.name.asc())
            .first()
        )

    if sub_ex:
        mg_sub_name = sub_ex.muscle_group.name if sub_ex.muscle_group else None
        substitute_out = schemas.ExerciseSubstituteOut(
            id=sub_ex.id,
            slug=sub_ex.slug,
            name=sub_ex.name,
            muscle_group_name=mg_sub_name,
            muscleGroup=mg_sub_name,
            subgroup=sub_ex.subgroup or sub_ex.primary_muscles,
            mediaUrl=sub_ex.image_url,
            equipment_type=None,
            mechanics_type=sub_ex.mechanics_type,
            key_cue=sub_ex.key_cue,
            image_url=sub_ex.image_url,
        )

    # 2. Historial de series del usuario para este ejercicio
    user_id = current_user.id if current_user else 1

    sets_query = (
        db.query(models.WorkoutSet, models.WorkoutSession.date)
        .join(models.WorkoutSession, models.WorkoutSet.workout_session_id == models.WorkoutSession.id)
        .filter(
            models.WorkoutSet.exercise_id == exercise_id,
            models.WorkoutSet.completed == True,
            models.WorkoutSession.user_id == user_id,
            models.WorkoutSession.status == "completed",
        )
        .order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc(), models.WorkoutSet.id.desc())
        .all()
    )

    best_1rm_epley = None
    best_1rm_brzycki = None
    last_weight = 0.0
    last_reps = 0
    last_date = None

    if sets_query:
        # Última serie registrada
        first_set, first_date = sets_query[0]
        last_weight = float(first_set.weight or 0.0)
        last_reps = int(first_set.reps or 0)
        last_date = first_date

        max_epley = 0.0
        max_brzycki = 0.0
        for st, _ in sets_query:
            w = float(st.weight or 0.0)
            r = int(st.reps or 0)
            if w > 0 and r > 0:
                e1 = calculate_1rm_epley(w, r)
                b1 = calculate_1rm_brzycki(w, r)
                if e1 > max_epley:
                    max_epley = e1
                if b1 > max_brzycki:
                    max_brzycki = b1

        if max_epley > 0:
            best_1rm_epley = max_epley
            best_1rm_brzycki = max_brzycki

    # 3. Detección de fatiga en la última sesión realizada por el usuario
    last_session = (
        db.query(models.WorkoutSession)
        .filter(
            models.WorkoutSession.user_id == user_id,
            models.WorkoutSession.status == "completed",
        )
        .order_by(models.WorkoutSession.date.desc(), models.WorkoutSession.id.desc())
        .first()
    )

    fatigue_detected = False
    if last_session:
        if last_session.readiness_energy is not None and last_session.readiness_energy <= 2:
            fatigue_detected = True
        elif last_session.mental_effort is not None and last_session.mental_effort >= 4:
            fatigue_detected = True

    # 4. Cálculo de meta sugerida
    guidance = calculate_progressive_overload_guidance(
        last_weight=last_weight,
        last_reps=last_reps,
        fatigue_detected=fatigue_detected,
        mechanics_type=exercise.mechanics_type or "compuesto",
    )

    suggested_goal = schemas.SuggestedGoalOut(
        type=guidance["type"],
        suggested_weight=guidance["suggested_weight"],
        suggested_reps=guidance["suggested_reps"],
        reason=guidance["reason"],
        overload_weight=guidance["overload_weight"],
        overload_reps=guidance["overload_reps"],
        deload_weight=guidance["deload_weight"],
        fatigue_detected=guidance["fatigue_detected"],
    )

    return schemas.ExerciseGuidanceOut(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        slug=exercise.slug,
        muscleGroup=exercise.muscle_group.name if exercise.muscle_group else None,
        subgroup=exercise.subgroup or exercise.primary_muscles,
        mediaUrl=exercise.image_url,
        equipment_type=None,
        mechanics_type=exercise.mechanics_type,
        key_cue=exercise.key_cue,
        image_url=exercise.image_url,
        previous_1rm=best_1rm_epley,
        previous_1rm_epley=best_1rm_epley,
        previous_1rm_brzycki=best_1rm_brzycki,
        last_weight=last_weight if last_weight > 0 else None,
        last_reps=last_reps if last_reps > 0 else None,
        last_date=last_date,
        fatigue_detected=fatigue_detected,
        suggested_goal=suggested_goal,
        substitute_exercise=substitute_out,
    )

