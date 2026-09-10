import datetime as dt
import os
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db

router = APIRouter()


def _get_athlete_training_summary(db: Session, days: int = 14) -> dict:
    """Extracts recent training, volume, PRs, and readiness for AI synthesis."""
    cutoff = dt.date.today() - dt.timedelta(days=days)
    sessions = (
        db.query(models.WorkoutSession)
        .options(
            joinedload(models.WorkoutSession.muscle_group),
            joinedload(models.WorkoutSession.sets).joinedload(models.WorkoutSet.exercise),
        )
        .filter(
            models.WorkoutSession.status == "completed",
            models.WorkoutSession.date >= cutoff,
        )
        .order_by(models.WorkoutSession.date.desc())
        .all()
    )

    profile = db.get(models.UserProfile, 1)
    exp_level = profile.experience_level if profile and profile.experience_level else "intermedio"

    total_volume = 0.0
    total_sets = 0
    strength_sessions = 0
    cardio_sessions = 0
    total_distance_km = 0.0
    willpower_sessions = 0
    exercise_maxes = {}

    for s in sessions:
        if s.sport_type == "strength":
            strength_sessions += 1
        else:
            cardio_sessions += 1
            if s.distance_km:
                total_distance_km += s.distance_km

        is_wp = (s.readiness_energy is not None and s.readiness_energy <= 2) or (
            s.mental_effort is not None and s.mental_effort >= 4
        )
        if is_wp:
            willpower_sessions += 1

        for st in s.sets:
            if st.completed:
                total_sets += 1
                vol = (st.weight or 0.0) * (st.reps or 0)
                total_volume += vol
                ex_name = st.exercise.name if st.exercise else f"Ejercicio #{st.exercise_id}"
                if ex_name not in exercise_maxes or (st.weight or 0.0) > exercise_maxes[ex_name]["weight"]:
                    exercise_maxes[ex_name] = {
                        "weight": st.weight or 0.0,
                        "reps": st.reps or 0,
                        "date": s.date,
                    }

    return {
        "experience_level": exp_level,
        "total_workouts": len(sessions),
        "strength_sessions": strength_sessions,
        "cardio_sessions": cardio_sessions,
        "total_distance_km": round(total_distance_km, 1),
        "total_volume_kg": round(total_volume, 1),
        "total_sets": total_sets,
        "willpower_sessions": willpower_sessions,
        "top_exercises": [
            {"name": k, "weight": v["weight"], "reps": v["reps"]}
            for k, v in list(exercise_maxes.items())[:5]
        ],
    }


@router.get("/weekly-briefing", response_model=schemas.AIWeeklyBriefingOut)
def get_weekly_briefing(db: Session = Depends(get_db)):
    summary = _get_athlete_training_summary(db, days=14)
    exp = summary["experience_level"]
    tot_w = summary["total_workouts"]
    tot_vol = summary["total_volume_kg"]
    wp_count = summary["willpower_sessions"]

    achievements = []
    if tot_w > 0:
        achievements.append(
            f"Completaste {tot_w} entrenamientos ({summary['strength_sessions']} de fuerza"
            + (f", {summary['total_distance_km']} km de carrera/cardio" if summary['total_distance_km'] > 0 else "")
            + ")."
        )
    if tot_vol > 0:
        achievements.append(f"Moviste un tonelaje acumulado de {tot_vol:,.0f} kg en {summary['total_sets']} series.")
    if wp_count > 0:
        achievements.append(
            f"Demostraste Voluntad de Hierro en {wp_count} {('sesión' if wp_count == 1 else 'sesiones')} "
            f"superando fatiga inicial o alta demanda mental."
        )
    if summary["top_exercises"]:
        top_ex = summary["top_exercises"][0]
        achievements.append(f"Carga destacada del período: {top_ex['name']} a {top_ex['weight']}kg × {top_ex['reps']} reps.")

    if not achievements:
        achievements.append("Iniciá tus entrenamientos para que el Coach IA genere tu diagnóstico con datos reales.")

    # Willpower analysis
    if wp_count > 0:
        wp_analysis = (
            f"Tu tasa de consistencia ante baja energía es sobresaliente ({wp_count} sesiones con energía ≤ 2 o RPE mental ≥ 4). "
            f"En tu nivel {exp}, la capacidad de entrenar sin depender de la motivación momentánea "
            f"es la variable número uno que predice adaptaciones neuromusculares sostenibles."
        )
    else:
        wp_analysis = (
            f"Mantuviste niveles estables de energía durante tus sesiones recientes. "
            f"Continuá registrando tu estado del día para correlacionar la calidad de tu descanso con el rendimiento en cargas."
        )

    # Overload recommendations based on level
    recommendations = []
    if exp == "principiante":
        recommendations = [
            "Mantené el foco en controlar la fase excéntrica (bajada de 2-3 seg) antes de apresurar incrementos de peso.",
            "Buscá progresar primero en repeticiones: cuando alcances 10-12 reps limpias en todas las series, sumá 1.25kg a 2.5kg.",
            "Asegurá al menos 48 horas de descanso entre sesiones del mismo grupo muscular.",
        ]
    elif exp == "avanzado":
        recommendations = [
            "Periodizá el esfuerzo: si tu RIR cae a 0 en ejercicios compuestos básicos, programá una semana de descarga activa (-40% volumen).",
            "Priorizá micro-cargas (1.25kg) en movimientos principales para estimular adaptaciones neuromusculares sin disparar fatiga del SNC.",
            "Evaluá la velocidad de barra para determinar si estás en un microciclo de acumulación o de sobrecarga límite.",
        ]
    else:  # intermedio
        recommendations = [
            "Consolidá tus series efectivas en RIR 1-2 (dejando 1 o 2 reps en reserva) para estimular hipertrofia sin fatiga excesiva.",
            "En ejercicios donde repetiste peso y repeticiones por 2 semanas consecutivas, intentá sumar 1 repetición en la primera serie.",
            "Monitoreá el volumen total semanal: 10 a 16 series efectivas por grupo muscular es tu rango hipertrófico óptimo.",
        ]

    # Recovery status
    if wp_count >= 3:
        recovery_status = "Exigencia mental y física acumulada alta. Considerá una sesión de movilidad activa o priorizá 8h de sueño reparador."
    elif tot_w >= 4:
        recovery_status = "Excelente ritmo de carga y volumen. La recuperación muscular avanza en sintonía con el estímulo."
    else:
        recovery_status = "Capacidad de recuperación disponible. Podés mantener la intensidad prevista para tus próximas sesiones."

    headline = (
        f"Consistencia Activa · Perfil {exp.capitalize()}"
        if tot_w > 0
        else "Nuevo Ciclo de Entrenamiento"
    )

    return schemas.AIWeeklyBriefingOut(
        period="Últimas 2 Semanas",
        headline=headline,
        experience_level=exp,
        total_workouts=tot_w,
        total_volume_kg=tot_vol,
        willpower_sessions=wp_count,
        achievements=achievements,
        willpower_analysis=wp_analysis,
        overload_recommendations=recommendations,
        recovery_status=recovery_status,
        generated_at=dt.datetime.utcnow(),
    )


@router.post("/ask", response_model=schemas.AIAskOut)
def ask_ai_coach(payload: schemas.AIAskIn, db: Session = Depends(get_db)):
    q = payload.question.strip()
    if not q:
        raise HTTPException(status_code=400, detail="La consulta no puede estar vacía.")

    summary = _get_athlete_training_summary(db, days=30)
    exp = summary["experience_level"]
    tot_w = summary["total_workouts"]
    tot_vol = summary["total_volume_kg"]
    top_exs = summary["top_exercises"]
    q_norm = q.lower()

    cited_data = [
        f"Nivel de atleta: {exp.capitalize()}",
        f"Sesiones en últimos 30 días: {tot_w}",
        f"Volumen acumulado: {tot_vol:,.0f} kg",
    ]
    for te in top_exs[:3]:
        cited_data.append(f"{te['name']}: {te['weight']}kg × {te['reps']}")

    # Classify intent & formulate structured response
    if any(k in q_norm for k in ["sobrecarga", "progres", "peso", "subir", "kilos", "kg", "fuerza"]):
        category = "overload"
        if top_exs:
            top_desc = ", ".join([f"{t['name']} ({t['weight']}kg × {t['reps']})" for t in top_exs[:2]])
            answer = (
                f"Según tus registros recientes como atleta {exp}, venís con marcas de referencia como {top_desc}. "
                f"La sobrecarga progresiva no requiere duplicar pesos: un incremento de 1.25 kg a 2.5 kg o buscar tan solo 1 repetición "
                f"adicional en tu serie más pesada es suficiente para activar la mecanotransducción y estimular nueva hipertrofia muscular. "
                f"Asegurate de mantener RIR 1-2 para no acumular fatiga innecesaria en las series de apoyo."
            )
        else:
            answer = (
                f"Para un atleta {exp}, la regla de oro de la sobrecarga progresiva consiste en fijar un rango (ej: 8-12 reps). "
                f"Cuando logres completar 12 repeticiones en todas tus series de trabajo con técnica estricta, "
                f"aumentá la carga en un 2.5% a 5% y comenzá nuevamente desde la base del rango."
            )

    elif any(k in q_norm for k in ["energia", "cansad", "fatiga", "sueno", "dormi", "baja", "animo", "desgano"]):
        category = "willpower"
        answer = (
            f"Entrenar con energía baja (1 o 2 sobre 5) es exactamente donde se forja la Voluntad de Hierro. "
            f"Nuestra recomendación científica para hoy: no busques batir récords de 1RM; tu objetivo es cumplir el volumen previsto. "
            f"Tomá descansos más prolongados (2 a 3 minutos entre series), calentá con 2 series extra de aproximación livianas "
            f"y mantené RIR 2-3 (a 2 o 3 repeticiones del fallo). Con solo presentarte y mover peso, ya habrás consolidado tu disciplina."
        )

    elif any(k in q_norm for k in ["serie", "repeticion", "reps", "cuantas rep"]):
        category = "concept"
        if exp == "principiante":
            answer = (
                f"Para tu nivel principiante: una repetición es cada subida y bajada controlada del peso; una serie es el bloque "
                f"de repeticiones seguidas antes de descansar. Tu rango más seguro y efectivo es de 3 a 4 series de 8 a 12 repeticiones, "
                f"controlando la bajada en 2-3 segundos."
            )
        elif exp == "avanzado":
            answer = (
                f"En tu nivel avanzado, el rango de series y repeticiones debe periodizarse según el objetivo del bloque: "
                f"4 a 6 reps para fuerza neural (RPE 8-9), 8 a 12 reps para hipertrofia mecánica, y 15 a 20 reps con técnicas "
                f"como rest-pause para estrés metabólico, controlando el volumen dentro de tu MRV."
            )
        else:
            answer = (
                f"En nivel intermedio, utilizá el rango de 8 a 12 repeticiones con la regla de progresión doble: "
                f"mantené el peso hasta completar 12 reps en todas tus series de trabajo con RIR 1-2, y luego aumentá 1.25kg a 2.5kg "
                f"retrocediendo a 8 reps."
            )

    elif any(k in q_norm for k in ["volumen", "tonelaje", "cuantas series"]):
        category = "volume"
        if exp == "principiante":
            answer = (
                f"El volumen es Series × Repeticiones × Peso levantado. Como atleta principiante, tu cuerpo responde rápido: "
                f"con 6 a 10 series de calidad por grupo muscular a la semana es suficiente para hipertrofia y fuerza sin fatigarte en exceso."
            )
        elif exp == "avanzado":
            answer = (
                f"En nivel avanzado, tu volumen se gestiona entre el MEV (Volumen Mínimo Efectivo ~8 series/sem) y tu MRV "
                f"(Volumen Máximo Recuperable ~18-22 series/sem). Monitoreá la retención de carga en días bajos y programá una descarga "
                f"cuando alcances tu MRV."
            )
        else:
            answer = (
                f"En nivel intermedio, tu rango hipertrófico óptimo es de 10 a 16 series efectivas semanales por grupo muscular. "
                f"Distribuirlas en 2 sesiones semanales (frecuencia 2) maximiza los picos de síntesis proteica."
            )

    elif any(k in q_norm for k in ["pr", "record", "1rm", "maxima"]):
        category = "records"
        if exp == "principiante":
            answer = (
                f"Tu PR (Personal Record) es el mayor peso o repeticiones que lograste en un ejercicio. En nivel principiante no hace "
                f"falta buscarlo en cada sesión: tus adaptaciones neuromusculares harán que suba naturalmente cada 1 o 2 semanas con buena técnica."
            )
        elif exp == "avanzado":
            answer = (
                f"En nivel avanzado, los PRs se conquistan mediante bloques de peaking: reducí el volumen un 40% durante 7-10 días para disipar fatiga, "
                f"y testeá tu 1RM o 3RM con singles de activación al 90% previo a la serie principal."
            )
        else:
            answer = (
                f"En nivel intermedio, buscá PRs de repeticiones (ej: lograr 10 reps con un peso con el que antes hacías 8) antes de forzar 1RM absolutos. "
                f"Esto garantiza sobrecarga progresiva sin comprometer las articulaciones."
            )

    elif any(k in q_norm for k in ["tecnica", "postura", "forma", "biomecanica"]):
        category = "technique"
        if exp == "principiante":
            answer = (
                f"La técnica es tu prioridad absoluta. Bajá el peso en 2 a 3 segundos (fase excéntrica), completá todo el rango de movimiento "
                f"y jamás balancees el cuerpo para mover la carga. La buena técnica previene dolores y asegura que el músculo correcto trabaje."
            )
        elif exp == "avanzado":
            answer = (
                f"En tu nivel avanzado, optimizá la técnica según tu anatomía individual: alineá el perfil de resistencia de la máquina o cable "
                f"con la curva de longitud-tensión del músculo y gestioná la fatiga axial para entrenar con alta frecuencia sin comprometer el raquis."
            )
        else:
            answer = (
                f"En nivel intermedio, perfeccioná la proximidad al fallo (RIR 1-2): la técnica debe mantenerse estricta e idéntica desde la "
                f"primera repetición hasta la última. Si la postura se descompone, la serie concluyó."
            )

    elif any(k in q_norm for k in ["estancad", "meseta", "no subo", "trancad", "bloquead"]):
        category = "overload"
        if exp == "principiante":
            answer = (
                f"En nivel principiante, un estancamiento casi siempre se resuelve revisando tres puntos: descansar al menos 48h entre sesiones "
                f"del mismo músculo, dormir 7-8 horas y buscar primero 1 repetición extra antes de pensar en subir kilos."
            )
        elif exp == "avanzado":
            answer = (
                f"Para un atleta avanzado, salir de una meseta requiere periodización: programá 1 semana de descarga activa al 50% de volumen, "
                f"trabajá puntos de estancamiento (sticking points) con pausas isométricas de 2s y rotá el implemento (barra a mancuernas o déficit) por 4 semanas."
            )
        else:
            answer = (
                f"Las mesetas en nivel {exp} suelen deberse a fatiga neuromuscular residual o a estancamiento en un mismo plano biomecánico. "
                f"Estrategias para romper el estancamiento:\n"
                f"1. Realizá una 'descarga activa' de 1 semana reduciendo las series a la mitad pero manteniendo el peso.\n"
                f"2. Utilizá micro-cargas de 1.25 kg por lado.\n"
                f"3. Variá el ángulo o implemento por 3 semanas (ej: de press con barra a press con mancuernas) para reactivar el estímulo neuromuscular."
            )

    elif any(k in q_norm for k in ["recuperac", "descans", "descarga", "dolor", "agujet", "molestia"]):
        category = "recovery"
        answer = (
            f"Tu volumen de las últimas semanas ({tot_vol:,.0f} kg en {tot_w} sesiones) demanda atención a la recuperación. "
            f"El músculo crece durante el reposo: asegurá entre 1.6g y 2.2g de proteína por kg de peso corporal al día, "
            f"mínimo 7-8 horas de sueño profundo y respetá al menos 48 horas antes de volver a solicitar de forma pesada el mismo grupo muscular."
        )

    elif any(k in q_norm for k in ["cardio", "correr", "running", "bici", "futbol", "resistencia"]):
        category = "multisport"
        answer = (
            f"El entrenamiento concurrente (fuerza + cardio/multideporte) es plenamente compatible si se programa con orden. "
            f"Para no interferir con la señal de hipertrofia muscular: separá las sesiones de carrera intensa o fútbol de tus entrenamientos "
            f"pesados de pierna por al menos 6 horas (o realizalos en días alternos), y asegurá un consumo adecuado de carbohidratos para reponer el glucógeno."
        )

    else:
        category = "general"
        answer = (
            f"Como atleta de nivel {exp}, tu consistencia ({tot_w} sesiones recientes) es tu mayor activo. "
            f"Priorizá registrar cada serie de inmediato, calibrar tu estado de energía al ingresar y evaluar tu esfuerzo mental al finalizar. "
            f"FitTracker continuará correlacionando tu volumen y sobrecarga progresiva en cada sesión."
        )


    return schemas.AIAskOut(
        question=q,
        answer=answer,
        category=category,
        cited_data=cited_data,
        generated_at=dt.datetime.utcnow(),
    )
