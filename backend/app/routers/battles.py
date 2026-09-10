import datetime as dt
import random
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter()


def compute_relative_strength(weight_lifted: float, bodyweight: float, reps: int):
    """
    Direct ratio: weight_lifted / bodyweight
    Duel score: (weight_lifted / (bodyweight ** 0.67)) * reps
    """
    bw = max(bodyweight, 1.0)
    ratio = round(weight_lifted / bw, 2)
    score = round((weight_lifted / (bw ** 0.67)) * reps, 2)
    return ratio, score


def generate_unique_pin(db: Session) -> str:
    """Generate a unique 4-digit PIN not in active use."""
    for _ in range(100):
        pin = f"{random.randint(1000, 9999)}"
        exists = (
            db.query(models.LiveBattle)
            .filter(
                models.LiveBattle.pin_code == pin,
                models.LiveBattle.status.in_(["waiting", "in_progress"]),
            )
            .first()
        )
        if not exists:
            return pin
    return f"{random.randint(1000, 9999)}"


def serialize_battle(battle: models.LiveBattle) -> schemas.BattleOut:
    participants_out = []
    rounds_out = []

    for p in battle.participants:
        p_rounds = [
            r for r in battle.rounds if r.participant_name == p.user_name and r.is_validated
        ]
        total_score = round(sum(r.relative_score for r in p_rounds), 2)
        best_ratio = max([r.bodyweight_ratio for r in p_rounds] or [0.0])
        max_weight = max([r.weight_lifted for r in p_rounds] or [0.0])

        participants_out.append(
            schemas.BattleParticipantOut(
                id=p.id,
                user_id=p.user_id,
                user_name=p.user_name,
                bodyweight=p.bodyweight,
                completed_series=p.completed_series,
                is_creator=p.is_creator,
                total_score=total_score,
                best_ratio=best_ratio,
                max_weight=max_weight,
            )
        )

    for r in battle.rounds:
        rounds_out.append(
            schemas.BattleRoundOut(
                id=r.id,
                participant_name=r.participant_name,
                weight_lifted=r.weight_lifted,
                reps=r.reps,
                is_validated=r.is_validated,
                round_number=r.round_number,
                relative_score=r.relative_score,
                bodyweight_ratio=r.bodyweight_ratio,
                created_at=r.created_at,
            )
        )

    max_round = max([r.round_number for r in battle.rounds] or [1])
    validated_in_max_round = len(
        [r for r in battle.rounds if r.round_number == max_round and r.is_validated]
    )
    current_round = (
        max_round
        if validated_in_max_round < len(battle.participants) or len(battle.participants) == 0
        else min(battle.target_rounds, max_round + 1)
    )

    return schemas.BattleOut(
        id=battle.id,
        exercise_id=battle.exercise_id,
        exercise_name=battle.exercise.name if battle.exercise else "Ejercicio",
        pin_code=battle.pin_code,
        status=battle.status,
        current_turn_user_name=battle.current_turn_user_name,
        winner_user_name=battle.winner_user_name,
        target_rounds=battle.target_rounds,
        current_round=current_round,
        participants=participants_out,
        rounds=rounds_out,
        created_at=battle.created_at,
    )


@router.post("", response_model=schemas.BattleOut)
def create_battle(payload: schemas.BattleCreate, db: Session = Depends(get_db)):
    exercise = db.get(models.Exercise, payload.exercise_id)
    if not exercise:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado.")

    clean_name = payload.user_name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="El nombre del usuario no puede estar vacío.")

    pin_code = generate_unique_pin(db)

    user = db.query(models.User).filter(func.lower(models.User.username) == clean_name.lower()).first()

    battle = models.LiveBattle(
        exercise_id=payload.exercise_id,
        creator_user_id=user.id if user else None,
        pin_code=pin_code,
        status="waiting",
        current_turn_user_name=clean_name,
        target_rounds=payload.target_rounds,
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(battle)
    db.flush()

    participant = models.BattleParticipant(
        battle_id=battle.id,
        user_id=user.id if user else None,
        user_name=clean_name,
        bodyweight=payload.bodyweight,
        completed_series=0,
        is_creator=True,
    )
    db.add(participant)
    db.commit()
    db.refresh(battle)

    return serialize_battle(battle)


@router.post("/join", response_model=schemas.BattleOut)
def join_battle(payload: schemas.BattleJoin, db: Session = Depends(get_db)):
    clean_pin = payload.pin_code.strip()
    clean_name = payload.user_name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="El nombre del usuario no puede estar vacío.")

    battle = (
        db.query(models.LiveBattle)
        .filter(
            models.LiveBattle.pin_code == clean_pin,
            models.LiveBattle.status == "waiting",
        )
        .first()
    )
    if not battle:
        raise HTTPException(
            status_code=404,
            detail="No se encontró ningún duelo en espera con ese PIN. Verificá el código con tu compañero.",
        )

    if len(battle.participants) >= 2:
        raise HTTPException(status_code=400, detail="El duelo ya cuenta con 2 participantes.")

    if any(p.user_name.lower() == clean_name.lower() for p in battle.participants):
        clean_name = f"{clean_name} (2)"

    user = db.query(models.User).filter(func.lower(models.User.username) == clean_name.lower()).first()

    opponent = models.BattleParticipant(
        battle_id=battle.id,
        user_id=user.id if user else None,
        user_name=clean_name,
        bodyweight=payload.bodyweight,
        completed_series=0,
        is_creator=False,
    )
    db.add(opponent)

    battle.opponent_user_id = user.id if user else None
    battle.status = "in_progress"
    creator = next((p for p in battle.participants if p.is_creator), None)
    battle.current_turn_user_name = creator.user_name if creator else clean_name

    db.commit()
    db.refresh(battle)

    return serialize_battle(battle)


@router.get("/{battle_id}", response_model=schemas.BattleOut)
def get_battle(battle_id: int, db: Session = Depends(get_db)):
    battle = db.get(models.LiveBattle, battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail="Duelo no encontrado.")
    return serialize_battle(battle)


@router.post("/{battle_id}/submit-round", response_model=schemas.BattleOut)
def submit_battle_round(
    battle_id: int,
    payload: schemas.BattleRoundSubmit,
    participant_name: str = Query(..., description="Nombre del participante que completó la serie"),
    db: Session = Depends(get_db),
):
    battle = db.get(models.LiveBattle, battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail="Duelo no encontrado.")

    if battle.status != "in_progress":
        raise HTTPException(status_code=400, detail="El duelo no está en progreso.")

    pending_round = (
        db.query(models.BattleRound)
        .filter(models.BattleRound.battle_id == battle_id, models.BattleRound.is_validated == False)
        .first()
    )
    if pending_round:
        raise HTTPException(
            status_code=400,
            detail=f"Hay una serie pendiente de validación por parte de tu compañero ({pending_round.participant_name}).",
        )

    participant = next(
        (p for p in battle.participants if p.user_name.lower() == participant_name.strip().lower()),
        None,
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado en este duelo.")

    p_rounds_count = len(
        [r for r in battle.rounds if r.participant_name == participant.user_name and r.is_validated]
    )
    round_number = p_rounds_count + 1

    ratio, score = compute_relative_strength(
        payload.weight_lifted, participant.bodyweight, payload.reps
    )

    new_round = models.BattleRound(
        battle_id=battle.id,
        participant_name=participant.user_name,
        weight_lifted=payload.weight_lifted,
        reps=payload.reps,
        is_validated=False,
        round_number=round_number,
        relative_score=score,
        bodyweight_ratio=ratio,
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    db.add(new_round)
    db.commit()
    db.refresh(battle)

    return serialize_battle(battle)


@router.post("/{battle_id}/validate-round", response_model=schemas.BattleOut)
def validate_battle_round(
    battle_id: int,
    payload: schemas.BattleRoundValidate,
    db: Session = Depends(get_db),
):
    battle = db.get(models.LiveBattle, battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail="Duelo no encontrado.")

    round_item = db.get(models.BattleRound, payload.round_id)
    if not round_item or round_item.battle_id != battle_id:
        raise HTTPException(status_code=404, detail="Serie a validar no encontrada.")

    participant = next(
        (p for p in battle.participants if p.user_name == round_item.participant_name), None
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participante de la serie no encontrado.")

    if payload.reps is not None and payload.reps >= 0:
        round_item.reps = payload.reps
        ratio, score = compute_relative_strength(
            round_item.weight_lifted, participant.bodyweight, round_item.reps
        )
        round_item.bodyweight_ratio = ratio
        round_item.relative_score = score

    round_item.is_validated = True
    participant.completed_series += 1

    other_participant = next(
        (p for p in battle.participants if p.user_name != participant.user_name), None
    )

    all_completed = (
        len(battle.participants) == 2
        and all(p.completed_series >= battle.target_rounds for p in battle.participants)
    )

    if all_completed:
        battle.status = "finished"
        p_scores = []
        for p in battle.participants:
            p_score = sum(
                r.relative_score
                for r in battle.rounds
                if r.participant_name == p.user_name and r.is_validated
            )
            p_scores.append((p, p_score))

        p_scores.sort(key=lambda x: x[1], reverse=True)
        winner = p_scores[0][0]
        battle.winner_user_name = winner.user_name
        battle.winner_user_id = winner.user_id
    else:
        if other_participant:
            battle.current_turn_user_name = other_participant.user_name

    db.commit()
    db.refresh(battle)
    return serialize_battle(battle)


@router.post("/{battle_id}/finish", response_model=schemas.BattleOut)
def finish_battle(battle_id: int, db: Session = Depends(get_db)):
    battle = db.get(models.LiveBattle, battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail="Duelo no encontrado.")

    battle.status = "finished"
    p_scores = []
    for p in battle.participants:
        p_score = sum(
            r.relative_score
            for r in battle.rounds
            if r.participant_name == p.user_name and r.is_validated
        )
        p_scores.append((p, p_score))

    if p_scores:
        p_scores.sort(key=lambda x: x[1], reverse=True)
        winner = p_scores[0][0]
        battle.winner_user_name = winner.user_name
        battle.winner_user_id = winner.user_id

    db.commit()
    db.refresh(battle)
    return serialize_battle(battle)


@router.post("/{battle_id}/save-to-workout")
def save_battle_to_workout(
    battle_id: int,
    user_name: str = Query(..., description="Nombre del participante cuyas series guardar"),
    db: Session = Depends(get_db),
):
    battle = db.get(models.LiveBattle, battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail="Duelo no encontrado.")

    rounds = [
        r
        for r in battle.rounds
        if r.participant_name.lower() == user_name.strip().lower() and r.is_validated
    ]
    if not rounds:
        raise HTTPException(
            status_code=400,
            detail="No hay series validadas para este participante en este duelo.",
        )

    participant = next(
        (p for p in battle.participants if p.user_name.lower() == user_name.strip().lower()), None
    )
    target_user_id = participant.user_id if participant and participant.user_id else 1

    today = dt.date.today()
    session = (
        db.query(models.WorkoutSession)
        .filter(
            models.WorkoutSession.user_id == target_user_id,
            models.WorkoutSession.date == today,
            models.WorkoutSession.status == "in_progress",
        )
        .first()
    )

    if not session:
        exercise = db.get(models.Exercise, battle.exercise_id)
        session = models.WorkoutSession(
            date=today,
            muscle_group_id=exercise.muscle_group_id if exercise else None,
            user_id=target_user_id,
            status="in_progress",
            notes=f"Duelo 1vs1 ({battle.exercise.name if battle.exercise else 'Duelo'})",
            started_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(session)
        db.flush()

    existing_sets_count = (
        db.query(func.count(models.WorkoutSet.id))
        .filter(
            models.WorkoutSet.workout_session_id == session.id,
            models.WorkoutSet.exercise_id == battle.exercise_id,
        )
        .scalar()
        or 0
    )

    added_sets = []
    for idx, r in enumerate(rounds):
        new_set = models.WorkoutSet(
            workout_session_id=session.id,
            exercise_id=battle.exercise_id,
            set_number=existing_sets_count + idx + 1,
            weight=r.weight_lifted,
            reps=r.reps,
            completed=True,
            rest_effort="pesado",
            created_at=r.created_at or dt.datetime.now(dt.timezone.utc),
        )
        db.add(new_set)
        added_sets.append(new_set)

    db.commit()

    return {
        "saved": True,
        "session_id": session.id,
        "sets_saved": len(added_sets),
        "message": f"¡Se agregaron {len(added_sets)} series de '{battle.exercise.name if battle.exercise else 'ejercicio'}' a tu sesión de hoy!",
    }
