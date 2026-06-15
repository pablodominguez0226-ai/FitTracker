from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from .. import models
from ..database import get_db
from ..security import get_current_user

router = APIRouter()


@router.get("")
def get_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    latest_measurement = (
        db.query(models.Measurement)
        .filter(models.Measurement.user_id == current_user.id)
        .order_by(models.Measurement.measured_at.desc(), models.Measurement.id.desc())
        .first()
    )
    previous_goal = (
        db.query(models.Measurement)
        .filter(models.Measurement.user_id == current_user.id, models.Measurement.goal_weight.is_not(None))
        .order_by(models.Measurement.measured_at.desc())
        .first()
    )
    latest_workout = (
        db.query(models.Workout)
        .options(selectinload(models.Workout.routine))
        .filter(models.Workout.user_id == current_user.id)
        .order_by(models.Workout.performed_at.desc(), models.Workout.id.desc())
        .first()
    )
    latest_record = (
        db.query(models.PersonalRecord)
        .options(selectinload(models.PersonalRecord.exercise))
        .filter(models.PersonalRecord.user_id == current_user.id)
        .order_by(models.PersonalRecord.achieved_at.desc(), models.PersonalRecord.id.desc())
        .first()
    )
    measurements = (
        db.query(models.Measurement)
        .filter(models.Measurement.user_id == current_user.id)
        .order_by(models.Measurement.measured_at.asc())
        .all()
    )

    current_weight = latest_measurement.weight if latest_measurement else None
    goal_weight = previous_goal.goal_weight if previous_goal else None
    difference = current_weight - goal_weight if current_weight is not None and goal_weight is not None else None

    return {
        "current_weight": current_weight,
        "goal_weight": goal_weight,
        "difference_to_goal": difference,
        "latest_workout": {
            "id": latest_workout.id,
            "date": latest_workout.performed_at,
            "routine": latest_workout.routine.name if latest_workout and latest_workout.routine else None,
        } if latest_workout else None,
        "latest_record": {
            "exercise": latest_record.exercise.name,
            "type": latest_record.record_type,
            "value": latest_record.value,
            "weight": latest_record.weight,
            "reps": latest_record.reps,
            "date": latest_record.achieved_at,
        } if latest_record else None,
        "measurements": [
            {
                "date": item.measured_at.isoformat(),
                "weight": item.weight,
                "waist": item.waist,
                "chest": item.chest,
                "arm": item.arm,
                "leg": item.leg,
                "calf": item.calf,
            }
            for item in measurements
        ],
    }
