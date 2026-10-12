import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

from ..security import get_current_user, get_optional_current_user

router = APIRouter()

LEVEL_EXPLANATIONS: dict[str, schemas.ExperienceLevelDetail] = {
    "principiante": schemas.ExperienceLevelDetail(
        id="principiante",
        title="Principiante",
        subtitle="Construcción de hábitos, técnica sólida y fundamentos",
        badge="Fundamentos",
        description="Foco en dominar la biomecánica, aprender la terminología de cargas y construir adherencia sin riesgo de lesión.",
        topics=["Conceptos Básicos", "Técnica", "Series y Repeticiones", "Volumen", "PR (Récord Personal)"],
        explanations=[
            schemas.ExplanationItem(
                id="p_series_reps",
                topic="conceptos_basicos",
                title="¿Qué son las Series y Repeticiones (Reps)?",
                summary="Una repetición es cada ejecución completa del movimiento. Una serie es el bloque de repeticiones continuas antes de descansar.",
                details=[
                    "Repetición (Rep): Es realizar la fase completa del ejercicio (subida y bajada controlada). Por ejemplo, 10 sentadillas seguidas son 10 repeticiones.",
                    "Serie (Set): Es el conjunto agrupado de repeticiones realizadas de corrido antes de tomar una pausa. Por ejemplo, hacer '3 series de 10 reps' significa hacer 10 reps, descansar, hacer otras 10 reps, descansar y finalizar con las últimas 10.",
                    "Rango óptimo inicial: Entre 8 y 12 repeticiones por serie permite un balance perfecto entre control motor, seguridad articular y estímulo muscular."
                ],
                icon="repeat",
            ),
            schemas.ExplanationItem(
                id="p_tecnica",
                topic="tecnica",
                title="Técnica y Biomecánica: Prioridad Absoluta",
                summary="El control postural y la cadencia excéntrica importan mucho más que el peso que pongas en la barra o mancuerna.",
                details=[
                    "Control excéntrico: Tardá de 2 a 3 segundos en bajar el peso. Esta fase genera el mayor estímulo de hipertrofia y enseña al cerebro el patrón motor correcto.",
                    "Rango de Movimiento Completo (ROM): Evitá repeticiones cortadas o a medias. Mover el peso en todo su recorrido construye tendones y articulaciones fuertes.",
                    "Sin impulsos compensatorios: Si balanceás el torso para levantar el peso, el esfuerzo se va del músculo objetivo y aumenta drásticamente el riesgo de molestia o lesión.",
                    "Calentamiento específico: Antes de cargar peso, realizá 1 o 2 series de aproximación muy livianas solo con el movimiento para lubricar articulaciones."
                ],
                icon="shield-check",
            ),
            schemas.ExplanationItem(
                id="p_volumen",
                topic="volumen",
                title="¿Qué es el Volumen de Entrenamiento?",
                summary="Es la cantidad total de trabajo muscular realizado, calculado como Series × Repeticiones × Peso levantado.",
                details=[
                    "Fórmula del volumen (tonelaje): Si hacés 3 series de 10 repeticiones con 20 kg, tu volumen total en ese ejercicio es 3 × 10 × 20 = 600 kg.",
                    "Menos es más al empezar: Como principiante, tu cuerpo responde y crece de forma sobresaliente con poco estímulo. Realizar entre 6 y 10 series semanales bien hechas por grupo muscular es suficiente.",
                    "Calidad sobre fatiga: Más series no siempre es mejor si las hacés con mala forma o agotado. FitTracker suma tu volumen de cada sesión para que veas tu progreso mes a mes."
                ],
                icon="layers",
            ),
            schemas.ExplanationItem(
                id="p_pr",
                topic="pr",
                title="¿Qué es un PR (Récord Personal)?",
                summary="PR significa 'Personal Record': es tu máxima marca histórica registrada en un ejercicio particular.",
                details=[
                    "Tipos de PR: Puede ser el mayor peso que lograste mover a 1 repetición, o tu mejor registro a un número dado de reps (ej: 40 kg × 10 reps).",
                    "No lo fuerces en cada sesión: En nivel principiante, los PRs llegarán casi solos cada 1 o 2 semanas gracias a la adaptación neuromuscular natural.",
                    "La regla de oro del PR: Un nuevo récord solo cuenta si se ejecutó con la misma técnica impecable que tus series normales. Nunca sacrifiques postura por subir kilos."
                ],
                icon="trophy",
            ),
        ],
        recommendations=[
            "Descansá entre 90 y 120 segundos entre series de fuerza para no empezar agotado la siguiente.",
            "Asegurá entre 48 y 72 horas de descanso antes de volver a entrenar intensamente el mismo músculo.",
            "Anotá cada peso y repetición en FitTracker apenas termines la serie mientras la memoria muscular está fresca."
        ],
    ),
    "intermedio": schemas.ExperienceLevelDetail(
        id="intermedio",
        title="Intermedio",
        subtitle="Sobrecarga progresiva sistemática, hipertrofia y consistencia",
        badge="Progresión",
        description="Foco en optimizar el volumen semanal, programar incrementos de carga precisos y sostener la disciplina en el tiempo.",
        topics=["Progresión", "Volumen", "Cargas", "Consistencia"],
        explanations=[
            schemas.ExplanationItem(
                id="i_progresion",
                topic="progresion",
                title="El Principio de Sobrecarga Progresiva",
                summary="Para que el músculo siga creciendo cuando la adaptación inicial termina, debés desafiarlo con estímulos incrementalmente mayores.",
                details=[
                    "Progresión doble (Rango de repeticiones): Fijá un rango objetivo (por ejemplo 8 a 12 reps). Empezá con un peso que te permita 8 reps limpias; en las siguientes sesiones buscá llegar a 9, 10, 11 y finalmente 12 reps con ese mismo peso.",
                    "Proximidad al fallo (RIR 1-2): RIR significa 'Reps in Reserve'. Finalizá tus series efectivas sintiendo que podías hacer 1 o máximo 2 repeticiones más con buena técnica. No hace falta ir al fallo absoluto en cada serie.",
                    "Variables de sobrecarga: Si no podés subir peso, progresar en 1 repetición extra, mejorar el control excéntrico o reducir 15 segundos el descanso también constituye sobrecarga progresiva."
                ],
                icon="trending-up",
            ),
            schemas.ExplanationItem(
                id="i_volumen",
                topic="volumen",
                title="Volumen Óptimo de Hipertrofia",
                summary="El rango de máxima respuesta muscular se sitúa entre 10 y 16 series efectivas semanales por grupo muscular.",
                details=[
                    "Series efectivas: Solo cuentan las series llevadas con intensidad real (RIR 1-3). Las series de aproximación no se computan como volumen de hipertrofia.",
                    "Frecuencia 2 recomendada: Distribuir 12 series semanales de pecho en dos sesiones de 6 series (ej: Lunes y Jueves) genera mayor síntesis proteica que meter 12 series en un solo día.",
                    "Monitoreo de tonelaje: Mirá los gráficos de 'Consistencia Semanal' en FitTracker. Un volumen semanal que se sostiene o crece moderadamente garantiza adaptaciones a largo plazo."
                ],
                icon="bar-chart-2",
            ),
            schemas.ExplanationItem(
                id="i_cargas",
                topic="cargas",
                title="Manejo de Cargas y Micro-Incrementos",
                summary="Los saltos de peso deben ser sostenibles: las micro-cargas de 1.25 kg a 2.5 kg son el secreto del progreso continuo.",
                details=[
                    "Ejercicios compuestos vs aislados: En sentadillas, press de banca o peso muerto podés subir 2.5 kg en bloque. En ejercicios de aislamiento (como vuelos laterales o bíceps), subí de a 1 kg o incrementá repeticiones primero.",
                    "Carga consolidada: Cuando alcances el tope de tu rango de repeticiones en todas tus series de trabajo, ese peso está consolidado y es momento de dar el salto al siguiente escalón.",
                    "Calentamiento estructurado: Hacé 1 serie al 40% del peso objetivo, 1 al 60% y 1 al 80% (con pocas reps) para preparar el sistema neuromuscular antes de la primera serie de trabajo."
                ],
                icon="dumbbell",
            ),
            schemas.ExplanationItem(
                id="i_consistencia",
                topic="consistencia",
                title="Consistencia y Gestión del Esfuerzo",
                summary="La adherencia al programa semana a semana vence a la intensidad esporádica desmedida.",
                details=[
                    "Días de baja energía (Voluntad de Hierro): Entrenar con energía 1 o 2 sobre 5 es valioso. No busques récords: cumplí el volumen planificado, descansá más tiempo y consolidá el hábito.",
                    "Adherencia del 85%+: No necesitás ser perfecto los 365 días del año; cumplir con 3 o 4 sesiones semanales de manera ininterrumpida durante 6 meses transforma tu físico.",
                    "Registro riguroso: Completá el estado de ánimo (Readiness) y esfuerzo mental en FitTracker para entender tus patrones de fatiga y recuperación."
                ],
                icon="flame",
            ),
        ],
        recommendations=[
            "Priorizá progresar en repeticiones antes de sumar kilos a la barra para consolidar la estructura articular.",
            "Descansá entre 2 y 3 minutos en básicos pesados y 60-90 segundos en ejercicios de aislamiento.",
            "Si una carga se siente estancada por más de 3 semanas, revisá si estás durmiendo al menos 7 horas y consumiendo suficiente proteína."
        ],
    ),
    "avanzado": schemas.ExperienceLevelDetail(
        id="avanzado",
        title="Avanzado",
        subtitle="Optimización neuromuscular, periodización, autorregulación y estancamientos",
        badge="Alto Rendimiento",
        description="Foco en análisis fino de fatiga del SNC, manejo de mesetas, periodización ondulante y técnica biomecánica de precisión.",
        topics=["Análisis de Rendimiento", "Volumen y MRV", "PR & Peaking", "Progresión Ondulante", "Estancamientos", "Técnica Avanzada"],
        explanations=[
            schemas.ExplanationItem(
                id="a_rendimiento",
                topic="rendimiento",
                title="Análisis de Rendimiento & Fatiga del SNC",
                summary="Aprender a medir la fatiga sistémica y neuromuscular para autorregular el volumen antes de caer en sobreentrenamiento.",
                details=[
                    "Monitoreo de RPE / RIR: Evaluar con precisión si una serie fue RPE 8, 9 o 10. A este nivel, el fallo técnico absoluto en básicos genera fatiga axial desproporcionada que compromete las sesiones de los próximos 4 días.",
                    "Velocidad de ejecución (VBT): Una desaceleración notable e involuntaria en la primera repetición con tu carga habitual es el indicador más certero de fatiga neuromuscular residual o falta de recuperación del SNC.",
                    "Índice de Voluntad & Retención: Observá en las métricas de FitTracker tu porcentaje de retención en días bajos; te indica la resiliencia de tu base de fuerza sin picos de adrenalina."
                ],
                icon="activity",
            ),
            schemas.ExplanationItem(
                id="a_volumen",
                topic="volumen",
                title="Gestión de MEV, MAV y MRV",
                summary="El volumen debe fluctuar estratégicamente a lo largo de los mesociclos para romper límites adaptativos.",
                details=[
                    "MEV (Minimum Effective Volume): El piso de series necesarias para mantener adaptaciones (generalmente 6-8 series/semana por músculo). Útil en semanas de descarga.",
                    "MAV (Maximum Adaptive Volume): El rango dulce donde se producen las máximas ganancias (12-20 series/semana según el grupo muscular y capacidad de recuperación).",
                    "MRV (Maximum Recoverable Volume): El techo biológico a partir del cual el volumen extra se convierte en 'volumen basura' y deteriora el rendimiento.",
                    "Estrategia de acumulación: Arrancar el mesociclo cerca del MEV e ir sumando 1-2 series por semana hasta tocar el MRV, para luego descargar."
                ],
                icon="layers",
            ),
            schemas.ExplanationItem(
                id="a_pr",
                topic="pr",
                title="Estrategia de PRs y Picos de Fuerza",
                summary="Los récords a nivel avanzado no son aleatorios: se planifican mediante fases de acumulación, intensificación y peaking.",
                details=[
                    "Diferenciación de PRs: Distinguí entre PR absoluto de 1RM, PR de repeticiones en rangos submáximos (ej: 5RM o 8RM) y PR de tonelaje acumulado en la sesión.",
                    "Peaking de fuerza: Reducir el volumen en un 40-50% manteniendo la intensidad de carga durante 7 a 10 días disipa la fatiga y revela la verdadera capacidad neuromuscular.",
                    "Singles y series pesadas de aproximación (Potenciación Post-Activación): Una serie pesada al 90% a 1 rep antes del trabajo de hipertrofia activa unidades motoras de alto umbral."
                ],
                icon="trophy",
            ),
            schemas.ExplanationItem(
                id="a_progresion",
                topic="progresion",
                title="Progresión No Lineal y Periodización Ondulante",
                summary="La progresión lineal ya no es suficiente: la periodización ondulante diaria (DUP) previene adaptaciones refractarias.",
                details=[
                    "Periodización Ondulante Diaria (DUP): Entrenar un mismo grupo con diferentes focos en la misma semana (ej: Día 1 = Fuerza a 4-6 reps; Día 2 = Hipertrofia a 8-12 reps; Día 3 = Bombeo metabólico a 15-20 reps).",
                    "Variación de estímulo sin cambiar de ejercicio: Mantené el ejercicio base para permitir sobrecarga motora, pero alterá los rangos de repetición o los tiempos de descanso.",
                    "Micro-cargas fraccionadas: Discos de 0.5 kg y 1.25 kg son indispensables para continuar elevando la curva de fuerza en básicos consolidados."
                ],
                icon="trending-up",
            ),
            schemas.ExplanationItem(
                id="a_estancamientos",
                topic="estancamientos",
                title="Resolución de Mesetas y Estancamientos",
                summary="Protocolos basados en evidencia para destrabar estancamientos crónicos en cargas o repeticiones.",
                details=[
                    "Descarga Activa Programada (Deload): Reducir al 50% las series de trabajo manteniendo el 85-90% de la carga habitual durante 1 semana completa. Restaura la sensibilidad neuromuscular y repara microtraumas tendinosos.",
                    "Aislamiento de sticking points (puntos de estancamiento): Usar pausas isométricas de 2 segundos en el punto de máxima desventaja mecánica (ej: en el pecho en press banca o en el paralelo en sentadilla).",
                    "Rotación estratégica de variantes: Si el press de banca plano con barra está estancado por más de 6 semanas, rotar a press con mancuernas pesadas o press inclinado por un bloque de 4 semanas para reactivar adaptaciones sin inhibición recíproca."
                ],
                icon="zap",
            ),
            schemas.ExplanationItem(
                id="a_tecnica_avanzada",
                topic="tecnica_avanzada",
                title="Técnica Biomecánica Avanzada y Autorregulación",
                summary="Alineación personalizada según la anatomía individual y gestión inteligente de la fatiga articular.",
                details=[
                    "Alineación de perfil de resistencia y curva de fuerza: Seleccionar implementos (cables, máquinas convergentes, peso libre) que apliquen máxima tensión donde el músculo está en máxima ventaja mecánica.",
                    "Gestión de fatiga axial: Equilibrar movimientos que cargan la columna vertebral con variantes apoyadas en banco o cables para permitir mayor volumen sin agotar el raquis.",
                    "Autorregulación intrasesión: Si en la primera serie efectiva el peso se siente 2 puntos de RPE más pesado que lo habitual, recortar 1 serie accesoria y priorizar la calidad técnica de lo ejecutado."
                ],
                icon="target",
            ),
        ],
        recommendations=[
            "Programá semanas de descarga activa cada 5 a 7 semanas de entrenamiento ininterrumpido a alta intensidad.",
            "Monitoreá de cerca el RPE y no superes RPE 9 salvo en tests específicos de rendimiento programados.",
            "Combiná ejercicios con perfil de tensión en estiramiento (ej: fondos, sentadillas profundas) con perfil en acortamiento (cables) para hipertrofia regional completa."
        ],
    ),
}


@router.get("", response_model=schemas.UserProfileOut)
def get_user_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return schemas.UserProfileOut(
        id=current_user.id,
        experience_level=current_user.experience_level or "intermedio",
        bodyweight=current_user.bodyweight,
        height=current_user.height,
        training_goal=current_user.training_goal or "hipertrofia",
        target_goal=current_user.target_goal or current_user.training_goal or "hipertrofia",
        body_fat_percentage=current_user.body_fat_percentage,
        biceps_girth=current_user.biceps_girth,
        waist_girth=current_user.waist_girth,
        target_protein_g=current_user.target_protein_g,
        target_water_l=current_user.target_water_l,
        nutrition_context=current_user.nutrition_context or "no_especifica",
        supplements=current_user.supplements,
        health_notes=current_user.health_notes,
        updated_at=current_user.updated_at,
    )


@router.put("", response_model=schemas.UserProfileOut)
def update_user_profile(
    payload: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..services.biometrics import calculate_nutritional_requirements

    if payload.experience_level is not None:
        current_user.experience_level = payload.experience_level.strip().lower()

    if payload.bodyweight is not None:
        if payload.bodyweight <= 0:
            raise HTTPException(status_code=400, detail="El peso corporal debe ser mayor a 0 kg.")
        current_user.bodyweight = round(payload.bodyweight, 2)

    if payload.height is not None:
        if payload.height <= 0:
            raise HTTPException(status_code=400, detail="La altura debe ser mayor a 0 cm.")
        current_user.height = round(payload.height, 2)

    if payload.training_goal is not None:
        goal = payload.training_goal.strip().lower()
        if goal not in schemas.VALID_TRAINING_GOALS:
            raise HTTPException(
                status_code=400,
                detail=f"Objetivo no válido. Opciones: {', '.join(schemas.VALID_TRAINING_GOALS)}"
            )
        current_user.training_goal = goal
        if payload.target_goal is None:
            current_user.target_goal = goal

    if payload.target_goal is not None:
        t_goal = payload.target_goal.strip().lower()
        if t_goal not in schemas.VALID_TARGET_GOALS and t_goal not in schemas.VALID_TRAINING_GOALS:
            raise HTTPException(
                status_code=400,
                detail=f"Objetivo objetivo no válido. Opciones: {', '.join(schemas.VALID_TARGET_GOALS)}"
            )
        current_user.target_goal = t_goal

    if payload.body_fat_percentage is not None:
        if payload.body_fat_percentage <= 0 or payload.body_fat_percentage >= 100:
            raise HTTPException(status_code=400, detail="El porcentaje de grasa debe estar entre 1% y 99%.")
        current_user.body_fat_percentage = round(payload.body_fat_percentage, 1)

    if payload.biceps_girth is not None:
        if payload.biceps_girth <= 0:
            raise HTTPException(status_code=400, detail="El perímetro de bíceps debe ser mayor a 0 cm.")
        current_user.biceps_girth = round(payload.biceps_girth, 1)

    if payload.waist_girth is not None:
        if payload.waist_girth <= 0:
            raise HTTPException(status_code=400, detail="El perímetro de cintura debe ser mayor a 0 cm.")
        current_user.waist_girth = round(payload.waist_girth, 1)

    if payload.target_protein_g is not None:
        current_user.target_protein_g = round(payload.target_protein_g, 1)

    if payload.target_water_l is not None:
        current_user.target_water_l = round(payload.target_water_l, 2)

    # Si se actualizó el peso o el objetivo y no se fijaron manualmente proteína/agua, recalcular sugerencias
    if current_user.bodyweight and (payload.target_protein_g is None or payload.target_water_l is None):
        nutr = calculate_nutritional_requirements(
            bodyweight=current_user.bodyweight,
            body_fat_percentage=current_user.body_fat_percentage,
            target_goal=current_user.target_goal or current_user.training_goal or "hipertrofia",
            height=current_user.height,
        )
        if payload.target_protein_g is None:
            current_user.target_protein_g = nutr["target_protein_g"]
        if payload.target_water_l is None:
            current_user.target_water_l = nutr["target_water_l"]

    if payload.nutrition_context is not None:
        current_user.nutrition_context = payload.nutrition_context
    if payload.supplements is not None:
        current_user.supplements = payload.supplements
    if payload.health_notes is not None:
        current_user.health_notes = payload.health_notes

    current_user.updated_at = dt.datetime.now(dt.timezone.utc)

    # Sincronizar tabla user_profile
    profile = db.get(models.UserProfile, 1)
    if not profile:
        profile = models.UserProfile(
            id=1,
            experience_level=current_user.experience_level or "intermedio",
            bodyweight=current_user.bodyweight,
            height=current_user.height,
            training_goal=current_user.training_goal or "hipertrofia",
            target_goal=current_user.target_goal or "hipertrofia",
            body_fat_percentage=current_user.body_fat_percentage,
            biceps_girth=current_user.biceps_girth,
            waist_girth=current_user.waist_girth,
            target_protein_g=current_user.target_protein_g,
            target_water_l=current_user.target_water_l,
            nutrition_context=current_user.nutrition_context,
            supplements=current_user.supplements,
            health_notes=current_user.health_notes,
            updated_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(profile)
    else:
        profile.experience_level = current_user.experience_level or "intermedio"
        profile.bodyweight = current_user.bodyweight
        profile.height = current_user.height
        profile.training_goal = current_user.training_goal or "hipertrofia"
        profile.target_goal = current_user.target_goal or "hipertrofia"
        profile.body_fat_percentage = current_user.body_fat_percentage
        profile.biceps_girth = current_user.biceps_girth
        profile.waist_girth = current_user.waist_girth
        profile.target_protein_g = current_user.target_protein_g
        profile.target_water_l = current_user.target_water_l
        profile.nutrition_context = current_user.nutrition_context
        profile.supplements = current_user.supplements
        profile.health_notes = current_user.health_notes
        profile.updated_at = dt.datetime.now(dt.timezone.utc)

    db.commit()
    db.refresh(current_user)

    return schemas.UserProfileOut(
        id=current_user.id,
        experience_level=current_user.experience_level or "intermedio",
        bodyweight=current_user.bodyweight,
        height=current_user.height,
        training_goal=current_user.training_goal or "hipertrofia",
        target_goal=current_user.target_goal or "hipertrofia",
        body_fat_percentage=current_user.body_fat_percentage,
        biceps_girth=current_user.biceps_girth,
        waist_girth=current_user.waist_girth,
        target_protein_g=current_user.target_protein_g,
        target_water_l=current_user.target_water_l,
        nutrition_context=current_user.nutrition_context or "no_especifica",
        supplements=current_user.supplements,
        health_notes=current_user.health_notes,
        updated_at=current_user.updated_at,
    )


@router.get("/analytics", response_model=schemas.ProfileAnalyticsOut)
def get_profile_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna análisis biométrico de alta precisión:
    - FFMI de Casey Butt normalizado a 1.80m y masa magra/grasa
    - TMB y TDEE mediante fórmula Katch-McArdle
    - Requerimientos diarios sugeridos de proteína y agua
    - Potencial remanente hacia el límite genético natural
    """
    from ..services.biometrics import (
        calculate_ffmi,
        calculate_nutritional_requirements,
    )

    # Valores por defecto para cálculos si el usuario no los tiene cargados
    bw = current_user.bodyweight or 75.0
    h = current_user.height or 175.0
    bf = current_user.body_fat_percentage
    goal = current_user.target_goal or current_user.training_goal or "hipertrofia"

    ffmi_data = calculate_ffmi(bodyweight=bw, height=h, body_fat_percentage=bf)
    nutr_data = calculate_nutritional_requirements(
        bodyweight=bw,
        body_fat_percentage=bf,
        target_goal=goal,
        height=h
    )

    notes = []
    if current_user.bodyweight is None:
        notes.append("Peso corporal no configurado; se usó 75.0 kg de referencia.")
    if current_user.height is None:
        notes.append("Altura no configurada; se usó 175.0 cm de referencia.")
    if current_user.body_fat_percentage is None:
        notes.append("Porcentaje de grasa no configurado; se estimó con 15.0% de referencia atlética.")

    return schemas.ProfileAnalyticsOut(
        user_id=current_user.id,
        username=current_user.username,
        bodyweight=current_user.bodyweight,
        height=current_user.height,
        body_fat_percentage=current_user.body_fat_percentage,
        biceps_girth=current_user.biceps_girth,
        waist_girth=current_user.waist_girth,
        target_goal=goal,
        lean_mass_kg=ffmi_data["lean_mass_kg"],
        fat_mass_kg=ffmi_data["fat_mass_kg"],
        ffmi=ffmi_data["ffmi"],
        raw_ffmi=ffmi_data["raw_ffmi"],
        normalized_ffmi=ffmi_data["normalized_ffmi"],
        max_natural_ffmi=ffmi_data["max_natural_ffmi"],
        remaining_potential_ffmi=ffmi_data["remaining_potential"],
        potential_percentage=ffmi_data["potential_percentage"],
        is_natural_limit_reached=ffmi_data["is_natural_limit_reached"],
        tmb=nutr_data["tmb"],
        bmr=nutr_data["bmr"],
        tdee=nutr_data["tdee"],
        target_protein_g=nutr_data["target_protein_g"],
        target_water_l=nutr_data["target_water_l"],
        notes=notes,
    )


@router.get("/explanations", response_model=schemas.ProfileExplanationsResponse)
def get_experience_explanations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_level = current_user.experience_level if current_user and current_user.experience_level else "intermedio"
    if current_level not in LEVEL_EXPLANATIONS:
        current_level = "intermedio"

    return schemas.ProfileExplanationsResponse(
        current_level=current_level,
        levels=LEVEL_EXPLANATIONS,
    )


def compute_training_guidelines(
    training_goal: str,
    experience_level: str,
    nutrition_context: str = "no_especifica",
) -> schemas.TrainingGuidelinesOut:
    goal = (training_goal or "hipertrofia").lower().strip()
    level = (experience_level or "intermedio").lower().strip()
    nutrition = (nutrition_context or "no_especifica").lower().strip()

    if goal not in schemas.VALID_TRAINING_GOALS:
        goal = "hipertrofia"
    if level not in schemas.VALID_EXPERIENCE_LEVELS:
        level = "intermedio"
    if nutrition not in schemas.VALID_NUTRITION_CONTEXTS:
        nutrition = "no_especifica"

    matrix = {
        ("hipertrofia", "principiante"): {
            "optimal_rep_range": "8 a 12 repeticiones",
            "rest_time": "90 a 120 segundos",
            "recommended_rir": "RIR 2 a 3 (lejos del fallo, foco en control motor)",
            "weekly_sets_per_muscle": "8 a 12 series efectivas semanales",
            "technical_recommendations": [
                "Controlá 2-3 segundos la bajada (fase excéntrica) para enseñar el patrón biomecánico a los tendones.",
                "Realizá rango completo de movimiento sin impulsos compensatorios.",
                "Utilizá la progresión doble: subí repeticiones antes de aumentar kilos en la barra.",
            ],
            "summary": "Estímulo muscular óptimo con baja fatiga axial y máxima seguridad articular.",
        },
        ("hipertrofia", "intermedio"): {
            "optimal_rep_range": "6 a 12 reps (compuestos) / 10 a 15 reps (aislamiento)",
            "rest_time": "90 a 180 segundos",
            "recommended_rir": "RIR 1 a 2 (1 o 2 repeticiones en reserva al finalizar)",
            "weekly_sets_per_muscle": "12 a 16 series efectivas semanales (Frecuencia 2 recomendada)",
            "technical_recommendations": [
                "Progresión sistemática: cuando completes el tope del rango en todas las series, sumá de 1.25 a 2.5 kg.",
                "Mantené tensión continua en la porción media del recorrido.",
                "Descansá 2 a 3 minutos en multiarticulares pesados para disipar la fatiga central antes de la siguiente serie.",
            ],
            "summary": "Sobrecarga progresiva sistemática para maximizar la síntesis proteica miofibrilar.",
        },
        ("hipertrofia", "avanzado"): {
            "optimal_rep_range": "6 a 15 reps (periodización ondulante DUP)",
            "rest_time": "2 a 3 minutos en básicos / 60 a 90 segundos en poleas y máquinas",
            "recommended_rir": "RIR 0 a 1 en última serie (fallo técnico controlado en ejercicios guiados)",
            "weekly_sets_per_muscle": "14 a 20 series semanales (cerca del MAV, programando deloads)",
            "technical_recommendations": [
                "Alineá implementos con el perfil de resistencia óptimo (estiramiento vs acortamiento).",
                "Gestioná el MRV mediante semanas de descarga activa cada 5-6 semanas de alta intensidad.",
                "Utilizá microcargas de 0.5 a 1.25 kg para continuar forzando adaptaciones mecánicas.",
            ],
            "summary": "Autorregulación biomecánica fina y periodización ondulante de volumen e intensidad.",
        },
        ("fuerza", "principiante"): {
            "optimal_rep_range": "5 a 8 repeticiones",
            "rest_time": "2 a 3 minutos",
            "recommended_rir": "RIR 2 a 3 (técnica inmaculada)",
            "weekly_sets_per_muscle": "9 a 12 series semanales",
            "technical_recommendations": [
                "Aprendizaje de la maniobra de Valsalva e intra-abdominal pressure (IAP).",
                "Constancia en el set-up y postura de agarre en los levantamientos básicos.",
                "Calentamiento estructurado con series piramidales de aproximación.",
            ],
            "summary": "Coordinación neuromuscular inicial y consolidación de patrones motrices axiales.",
        },
        ("fuerza", "intermedio"): {
            "optimal_rep_range": "3 a 6 repeticiones",
            "rest_time": "3 a 4 minutos",
            "recommended_rir": "RIR 1 a 2 (alta tensión mecánica)",
            "weekly_sets_per_muscle": "10 a 14 series semanales",
            "technical_recommendations": [
                "Trabajo específico en sticking points mediante pausas isométricas de 1-2 segundos.",
                "Uso de tempo controlado para evitar pérdidas de rigidez en el punto de cambio de fase.",
                "Rotación planificada de variantes cada 4 a 6 semanas si se estanca la marca principal.",
            ],
            "summary": "Reclutamiento de unidades motoras de alto umbral y tensión mecánica máxima.",
        },
        ("fuerza", "avanzado"): {
            "optimal_rep_range": "1 a 5 repeticiones (bloques de peaking y 1RM)",
            "rest_time": "3 a 5 minutos",
            "recommended_rir": "RIR 1 (RIR 0 reservado exclusivamente a pruebas programadas)",
            "weekly_sets_per_muscle": "12 a 16 series semanales con taper",
            "technical_recommendations": [
                "Potenciación post-activación (PAP): singles pesados al 90% antes del volumen de trabajo.",
                "Velocidad de barra (VBT): detén la serie si la velocidad desciende más del 20%.",
                "Fase de descarga activa (tapering) para disipar fatiga residual antes de buscar récords personales.",
            ],
            "summary": "Máxima eficiencia neural, disipación de fatiga y expresión pico de fuerza absoluta.",
        },
        ("definicion_adelgazar", "principiante"): {
            "optimal_rep_range": "8 a 12 repeticiones",
            "rest_time": "60 a 90 segundos",
            "recommended_rir": "RIR 2",
            "weekly_sets_per_muscle": "8 a 12 series semanales",
            "technical_recommendations": [
                "Priorizá sostener los kilos que levantás en lugar de bajar peso para hacer repeticiones infinitas.",
                "El entrenamiento con cargas es el estímulo principal para indicar al cuerpo que no degrade músculo.",
                "Completá el descanso adecuado para no acumular fatiga innecesaria.",
            ],
            "summary": "Preservación estricta de tejido magro y mantenimiento del gasto metabólico basal.",
        },
        ("definicion_adelgazar", "intermedio"): {
            "optimal_rep_range": "6 a 10 reps (pesadas en básicos) + 10 a 15 (accesorios)",
            "rest_time": "90 a 120 segundos",
            "recommended_rir": "RIR 1 a 2",
            "weekly_sets_per_muscle": "10 a 14 series semanales (volumen moderado)",
            "technical_recommendations": [
                "No uses el entrenamiento con pesas para quemar calorías: mantené las cargas altas para proteger la masa magra.",
                "Reducí ligeramente el volumen de series si la recuperación se ve afectada por el déficit calórico.",
                "Priorizá ejercicios guiados o con soporte en banco para no sobrecargar la espalda baja.",
            ],
            "summary": "Retención miofibrilar máxima bajo déficit calórico con control de fatiga central.",
        },
        ("definicion_adelgazar", "avanzado"): {
            "optimal_rep_range": "6 a 10 reps firmes (cerca de MEV)",
            "rest_time": "2 minutos",
            "recommended_rir": "RIR 1 a 2",
            "weekly_sets_per_muscle": "10 a 14 series (evitar rebasar MRV que causaría catabolismo)",
            "technical_recommendations": [
                "Monitoreá de cerca el drop de fuerza: una caída >10% en cargas de trabajo indica déficit excesivo o sobreentrenamiento.",
                "Mantené alta ingesta proteica (2.0-2.4 g/kg) para preservar nitrógeno muscular.",
                "Sustituí parte del trabajo axial pesado por poleas para mitigar el riesgo articular con menor glucógeno.",
            ],
            "summary": "Estrategia de retención muscular y protección articular en porcentajes bajos de grasa corporal.",
        },
        ("potencia_rapidez", "principiante"): {
            "optimal_rep_range": "4 a 6 repeticiones a máxima aceleración",
            "rest_time": "2 a 3 minutos",
            "recommended_rir": "RIR 3 a 4 (detenerse antes de cualquier desaceleración)",
            "weekly_sets_per_muscle": "8 a 10 series semanales",
            "technical_recommendations": [
                "Cargas livianas a medias (40-50% 1RM) movidas con la máxima intención de velocidad posible.",
                "Pausa en el punto de cambio para eliminar el reflejo miotático parásito.",
                "Descanso completo entre series para recargar la fosfocreatina muscular.",
            ],
            "summary": "Intención concéntrica máxima y desarrollo de aceleración sin fatiga periférica.",
        },
        ("potencia_rapidez", "intermedio"): {
            "optimal_rep_range": "3 a 5 repeticiones",
            "rest_time": "2 a 3 minutos",
            "recommended_rir": "RIR 3",
            "weekly_sets_per_muscle": "10 a 12 series semanales",
            "technical_recommendations": [
                "Cargas al 50-65% 1RM para maximizar la tasa de desarrollo de fuerza (Rate of Force Development - RFD).",
                "Entrenamiento de contraste o complejos post-activación.",
                "Cada repetición debe ser tan explosiva como la primera.",
            ],
            "summary": "Tasa de desarrollo de fuerza y reclutamiento sincronizado de motoneuronas.",
        },
        ("potencia_rapidez", "avanzado"): {
            "optimal_rep_range": "2 a 4 repeticiones (series cluster)",
            "rest_time": "3 minutos",
            "recommended_rir": "RIR 3 a 4",
            "weekly_sets_per_muscle": "10 a 14 series",
            "technical_recommendations": [
                "Uso de series cluster (ej: 2+2+2 reps con 20s de micropausa) para mantener la velocidad pico en cada repetición.",
                "Medición de m/s con transductor o acelerómetro.",
                "Descargas regulares para preservar la reactividad del sistema tendón-músculo.",
            ],
            "summary": "Potencia elástica y reactiva de nivel competitivo con mantenimiento de velocidad terminal.",
        },
    }

    goal_matrix_key = {
        "powerlifting": "fuerza",
        "alto_rendimiento": "potencia_rapidez",
        "definicion": "definicion_adelgazar",
    }.get(goal, goal)

    entry = matrix.get(
        (goal_matrix_key, level),
        matrix.get(("hipertrofia", level), matrix[("hipertrofia", "intermedio")])
    )

    nutrition_notes = {
        "superavit_volumen": "Superávit calórico controlado (+250 a +400 kcal) y 1.6-2.2g de proteína/kg. Entorno óptimo para tolerar volumen de trabajo alto y facilitar hipertrofia y ganancias de fuerza.",
        "deficit_definicion": "Déficit calórico moderado (-300 a -500 kcal) y proteína elevada (2.0-2.4g/kg). La regla de oro es defender las cargas levantadas para señalizar retención de masa muscular magra.",
        "mantenimiento": "Calorías en balance con 1.6-2.0g de proteína/kg. Ideal para recomposición corporal, perfeccionamiento biomecánico y adaptación neural sin sobrecarga metabólica.",
        "no_especifica": "Mantené un consumo adecuado de proteínas (1.6 a 2.0g/kg de peso corporal) e hidratación constante (al menos 35-40 ml/kg) para optimizar el rendimiento y recuperación entre series.",
    }

    nutrition_advice = nutrition_notes.get(nutrition, nutrition_notes["no_especifica"])

    return schemas.TrainingGuidelinesOut(
        training_goal=goal,
        experience_level=level,
        nutrition_context=nutrition,
        optimal_rep_range=entry["optimal_rep_range"],
        rest_time=entry["rest_time"],
        recommended_rir=entry["recommended_rir"],
        weekly_sets_per_muscle=entry["weekly_sets_per_muscle"],
        technical_recommendations=entry["technical_recommendations"],
        nutrition_advice=nutrition_advice,
        summary=entry["summary"],
    )


@router.get("/training-guidelines", response_model=schemas.TrainingGuidelinesOut)
def get_training_guidelines(
    training_goal: str | None = None,
    experience_level: str | None = None,
    current_user: models.User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    goal = training_goal or (current_user.training_goal if current_user else "hipertrofia")
    level = experience_level or (current_user.experience_level if current_user else "intermedio")
    nutrition = current_user.nutrition_context if current_user else "no_especifica"

    return compute_training_guidelines(
        training_goal=goal,
        experience_level=level,
        nutrition_context=nutrition,
    )

