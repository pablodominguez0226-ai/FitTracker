from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models

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
        "Press banca plano con barra",
        "Press inclinado con barra",
        "Press declinado con barra",
        "Press plano con mancuernas",
        "Press inclinado con mancuernas",
        "Press declinado con mancuernas",
        "Aperturas planas con mancuernas",
        "Aperturas inclinadas con mancuernas",
        "Cruces en polea alta",
        "Cruces en polea baja",
        "Cruces en polea media",
        "Press de pecho en máquina convergente",
        "Press inclinado en máquina convergente",
        "Aperturas en máquina Peck Deck",
        "Fondos en paralelas para pecho",
        "Press de pecho en máquina Smith",
        "Press inclinado en máquina Smith",
        "Pullover con mancuerna",
        "Press Svend con disco",
        "Flexiones de brazos lastradas",
    ],
    "Espalda": [
        "Jalón al pecho en polea alta (prono)",
        "Jalón al pecho agarre neutro",
        "Remo con barra inclinado",
        "Remo con mancuerna a una mano",
        "Remo en polea baja sentado",
        "Remo en máquina T",
        "Pullover en polea alta",
        "Peso muerto convencional con barra",
        "Remo en máquina convergente",
        "Dominadas",
    ],
    "Pierna": [
        "Sentadilla trasera con barra",
        "Sentadilla frontal con barra",
        "Sentadilla búlgara con mancuernas",
        "Prensa de piernas inclinada 45°",
        "Sentadilla Hack en máquina",
        "Extensión de cuádriceps en máquina",
        "Curl femoral tumbado en máquina",
        "Curl femoral sentado en máquina",
        "Peso muerto rumano con barra",
        "Peso muerto rumano con mancuernas",
        "Hip Thrust con barra",
        "Hip Thrust en máquina",
        "Zancadas con mancuernas",
        "Sentadilla Goblet con mancuerna",
        "Sentadilla en máquina Smith",
        "Máquina de abductores",
        "Máquina de aductores",
        "Elevación de talones de pie en máquina",
        "Elevación de talones sentado en máquina",
        "Prensa de piernas para gemelos",
    ],
    "Hombro": [
        "Press militar de pie con barra",
        "Press con mancuernas sentado",
        "Press de hombros en máquina",
        "Elevaciones laterales con mancuernas",
        "Elevaciones laterales en polea",
        "Pájaros con mancuernas posterior",
        "Face pull en polea alta con cuerda",
        "Deltoides posterior en máquina Peck Deck",
        "Elevaciones frontales con mancuernas",
        "Encogimientos con mancuernas",
    ],
    "Brazos": [
        "Curl de bíceps con barra Z",
        "Curl alterno con mancuernas inclinado",
        "Curl predicador barra Z",
        "Curl martillo con mancuernas",
        "Curl en polea baja",
        "Press francés con barra Z",
        "Extensión de tríceps en polea con cuerda",
        "Extensión en polea con barra (pushdown)",
        "Fondos de tríceps en banco/paralelas",
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


def seed_initial_data(db: Session) -> None:
    # 1. Asegurar la existencia de los 6 grupos musculares clásicos
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
            group.name = group_name  # asegurar capitalización estándar
            db.flush()
        group_map[group_name] = group

    # 2. Precargar o actualizar de forma idempotente los 60 ejercicios oficiales
    official_names_set = set()
    for group_name, exercise_names in OFFICIAL_EXERCISES_CATALOG.items():
        group = group_map[group_name]
        for name in exercise_names:
            official_names_set.add(name.strip().lower())
            existing = (
                db.query(models.Exercise)
                .filter(func.lower(models.Exercise.name) == name.strip().lower())
                .first()
            )
            if existing:
                existing.name = name
                existing.muscle_group_id = group.id
                existing.is_active = True
            else:
                new_ex = models.Exercise(
                    name=name,
                    muscle_group_id=group.id,
                    is_active=True,
                )
                db.add(new_ex)

    db.flush()

    # 3. Desactivar ejercicios antiguos que no formen parte del catálogo oficial de 60
    # para no romper claves foráneas de series históricas registradas.
    all_exercises = db.query(models.Exercise).all()
    for ex in all_exercises:
        if ex.name.strip().lower() not in official_names_set:
            ex.is_active = False

    db.commit()


if __name__ == "__main__":
    from .database import SessionLocal
    with SessionLocal() as session:
        seed_initial_data(session)
        print("Seed completado exitosamente.")


