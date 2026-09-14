from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models

DEFAULT_MUSCLE_GROUPS = [
    "Pecho",
    "Espalda",
    "Pierna",
    "Hombro",
    "Brazos",
    "Core",
]

OFFICIAL_EXERCISES_CATALOG: dict[str, list[str]] = {
    "Pecho": [
        # Barra
        "Press banca plano con barra",
        "Press inclinado con barra",
        "Press declinado con barra",
        # Mancuernas
        "Press plano con mancuernas",
        "Press inclinado con mancuernas",
        "Aperturas en banco con mancuernas",
        "Pullover con mancuerna",
        # Poleas
        "Cruces en polea alta (haz inferior)",
        "Cruces en polea media",
        "Cruces en polea baja (haz superior)",
        # Máquinas/Libre
        "Fondos en paralelas para pecho",
        "Press de pecho en máquina convergente",
        "Press de pecho en máquina Smith",
        "Press inclinado en máquina convergente",
        "Aperturas en máquina Peck Deck",
        "Flexiones de brazos lastradas",
    ],
    "Espalda": [
        # Barra
        "Remo con barra (prono/supino)",
        "Remo Pendlay con barra",
        "Peso muerto convencional con barra",
        "Peso muerto rumano con barra",
        # Mancuernas
        "Remo a una mano con mancuerna",
        "Remo con apoyo en banco con mancuernas",
        # Poleas
        "Jalón al pecho prono en polea alta",
        "Jalón al pecho agarre neutro/estrecho",
        "Remo sentado en polea baja",
        "Pullover en polea alta",
        # Máquinas/Libre
        "Remo en T con apoyo en pecho",
        "Jalón en máquina convergente",
        "Remo en máquina convergente",
        "Dominadas",
    ],
    "Pierna": [
        # Barra
        "Sentadilla trasera con barra (Back squat)",
        "Sentadilla frontal con barra",
        "Hip Thrust con barra",
        "Prensa inclinada con discos",
        "Sentadilla Hack con barra",
        # Mancuernas
        "Zancadas caminando con mancuernas",
        "Sentadilla búlgara con mancuernas",
        "Peso muerto rumano con mancuernas",
        "Sentadilla Goblet con mancuerna",
        # Máquinas/Poleas
        "Extensión de cuádriceps en máquina",
        "Curl femoral acostado en máquina",
        "Curl femoral sentado en máquina",
        "Elevación de talones de pie en máquina",
        "Elevación de talones sentado en máquina",
        "Prensa de piernas en máquina",
        "Sentadilla Hack en máquina",
        "Máquina de abductores",
        "Máquina de aductores",
    ],
    "Hombro": [
        # Barra
        "Press militar de pie con barra",
        "Press sentado con barra",
        # Mancuernas
        "Press de hombros sentado con mancuernas",
        "Elevaciones laterales con mancuernas",
        "Pájaros para deltoides posterior con mancuernas",
        "Elevaciones frontales con mancuernas",
        "Encogimientos con mancuernas",
        # Poleas
        "Elevaciones laterales en polea baja",
        "Face pulls en polea alta con cuerda",
        # Máquinas
        "Press de hombros en máquina",
        "Deltoides posterior en máquina Peck Deck",
    ],
    "Brazos": [
        # Bíceps
        "Curl con barra Z",
        "Curl inclinado con mancuernas",
        "Curl martillo con mancuernas",
        "Curl en polea baja",
        "Curl predicador en máquina",
        "Curl predicador con barra Z",
        # Tríceps
        "Press francés con barra Z",
        "Extensiones en polea alta con cuerda",
        "Extensiones sobre la cabeza en polea (overhead)",
        "Fondos entre bancos / máquina",
        "Extensión en polea con barra (pushdown)",
        "Patada de tríceps en polea",
    ],
    "Core": [
        "Crunch abdominal en máquina",
        "Crunch en polea alta de rodillas",
        "Elevación de piernas colgado",
        "Plancha isométrica",
        "Giros rusos con disco",
        "Rueda abdominal (Ab Wheel)",
        "Leñador en polea (Woodchopper)",
        "Hiperextensiones lumbares en banco",
        "Crunch en suelo con disco",
        "Vacío abdominal / Dead bug",
    ],
}

# Aliases to map existing DB exercises to official names to prevent duplicates
ALIASES_MAP = {
    "cruces en polea alta": "Cruces en polea alta (haz inferior)",
    "cruces en polea baja": "Cruces en polea baja (haz superior)",
    "jalón al pecho en polea alta (prono)": "Jalón al pecho prono en polea alta",
    "jalón al pecho agarre neutro": "Jalón al pecho agarre neutro/estrecho",
    "remo con barra inclinado": "Remo con barra (prono/supino)",
    "remo en máquina t": "Remo en T con apoyo en pecho",
    "sentadilla trasera con barra": "Sentadilla trasera con barra (Back squat)",
    "prensa de piernas inclinada 45°": "Prensa inclinada con discos",
    "curl femoral tumbado en máquina": "Curl femoral acostado en máquina",
    "press con mancuernas sentado": "Press de hombros sentado con mancuernas",
    "pájaros con mancuernas posterior": "Pájaros para deltoides posterior con mancuernas",
    "face pull en polea alta con cuerda": "Face pulls en polea alta con cuerda",
    "curl de bíceps con barra z": "Curl con barra Z",
    "curl alterno con mancuernas inclinado": "Curl inclinado con mancuernas",
    "extensión de tríceps en polea con cuerda": "Extensiones en polea alta con cuerda",
    "fondos de tríceps en banco/paralelas": "Fondos entre bancos / máquina",
    "aperturas con mancuernas en banco plano": "Aperturas en banco con mancuernas",
    "aperturas planas con mancuernas": "Aperturas en banco con mancuernas",
    "fondos en paralelas": "Fondos en paralelas para pecho",
    "elevaciones laterales en polea": "Elevaciones laterales en polea baja",
    "curl predicador barra z": "Curl predicador con barra Z",
    "zancadas con mancuernas": "Zancadas caminando con mancuernas",
    "remo en polea baja sentado": "Remo sentado en polea baja",
    "remo con mancuerna a una mano": "Remo a una mano con mancuerna",
}


def seed_initial_data(db: Session) -> None:
    # 1. Asegurar la existencia de los grupos musculares
    group_map: dict[str, models.MuscleGroup] = {}
    for group_name in DEFAULT_MUSCLE_GROUPS:
        group = (
            db.query(models.MuscleGroup)
            .filter(func.lower(models.MuscleGroup.name) == group_name.lower())
            .first()
        )
        if not group:
            group = models.MuscleGroup(name=group_name)
            db.add(group)
            db.flush()
        else:
            group.name = group_name
            db.flush()
        group_map[group_name] = group

    # 2. Precargar o actualizar de forma estrictamente idempotente
    official_names_set = set()
    for group_name, exercise_names in OFFICIAL_EXERCISES_CATALOG.items():
        group = group_map[group_name]
        for name in exercise_names:
            official_names_set.add(name.strip().lower())

            # 2.1 Buscar coincidencia por nombre canónico
            canonical_ex = (
                db.query(models.Exercise)
                .filter(func.lower(models.Exercise.name) == name.strip().lower())
                .first()
            )

            # 2.2 Buscar si existe con un alias histórico conocido
            alias_ex = None
            for alias_name, target_name in ALIASES_MAP.items():
                if target_name.strip().lower() == name.strip().lower():
                    found = (
                        db.query(models.Exercise)
                        .filter(func.lower(models.Exercise.name) == alias_name.strip().lower())
                        .first()
                    )
                    if found:
                        alias_ex = found
                        break

            # 2.3 Si existen ambos (el canónico y el alias), fusionar preservando el que tiene series
            if canonical_ex and alias_ex and canonical_ex.id != alias_ex.id:
                alias_sets = db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == alias_ex.id).count()
                canon_sets = db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == canonical_ex.id).count()
                if alias_sets >= canon_sets:
                    # Conservar alias_ex y migrar sets de canonical_ex
                    db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == canonical_ex.id).update(
                        {"exercise_id": alias_ex.id}
                    )
                    db.delete(canonical_ex)
                    db.flush()
                    alias_ex.name = name
                    alias_ex.muscle_group_id = group.id
                    alias_ex.is_active = True
                    existing = alias_ex
                else:
                    # Conservar canonical_ex y migrar sets de alias_ex
                    db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == alias_ex.id).update(
                        {"exercise_id": canonical_ex.id}
                    )
                    db.delete(alias_ex)
                    db.flush()
                    canonical_ex.muscle_group_id = group.id
                    canonical_ex.is_active = True
                    existing = canonical_ex
            elif canonical_ex:
                canonical_ex.muscle_group_id = group.id
                canonical_ex.is_active = True
                existing = canonical_ex
            elif alias_ex:
                alias_ex.name = name
                alias_ex.muscle_group_id = group.id
                alias_ex.is_active = True
                existing = alias_ex
            else:
                new_ex = models.Exercise(
                    name=name,
                    muscle_group_id=group.id,
                    is_active=True,
                )
                db.add(new_ex)

    db.flush()

    # 3. Solo desactivar ejercicios que no pertenezcan al catálogo Y no tengan series registradas
    used_exercise_ids = {
        uid[0]
        for uid in db.query(models.WorkoutSet.exercise_id).distinct().all()
    }
    all_exercises = db.query(models.Exercise).all()
    for ex in all_exercises:
        if ex.name.strip().lower() not in official_names_set:
            if ex.id not in used_exercise_ids:
                ex.is_active = False

    db.commit()
