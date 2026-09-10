import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

from ..security import get_current_user

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
        updated_at=current_user.updated_at,
    )


@router.put("", response_model=schemas.UserProfileOut)
def update_user_profile(
    payload: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    valid_levels = ["principiante", "intermedio", "avanzado"]
    if payload.experience_level is not None:
        level = payload.experience_level.strip().lower()
        if level not in valid_levels:
            raise HTTPException(
                status_code=400,
                detail=f"Nivel de experiencia no válido. Opciones: {', '.join(valid_levels)}"
            )
        current_user.experience_level = level

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

    current_user.updated_at = dt.datetime.now(dt.timezone.utc)

    # Keep user_profile table in sync for compatibility
    profile = db.get(models.UserProfile, 1)
    if not profile:
        profile = models.UserProfile(
            id=1,
            experience_level=current_user.experience_level or "intermedio",
            bodyweight=current_user.bodyweight,
            height=current_user.height,
            training_goal=current_user.training_goal or "hipertrofia",
            updated_at=dt.datetime.now(dt.timezone.utc),
        )
        db.add(profile)
    else:
        profile.experience_level = current_user.experience_level or "intermedio"
        profile.bodyweight = current_user.bodyweight
        profile.height = current_user.height
        profile.training_goal = current_user.training_goal or "hipertrofia"
        profile.updated_at = dt.datetime.now(dt.timezone.utc)

    db.commit()
    db.refresh(current_user)

    return schemas.UserProfileOut(
        id=current_user.id,
        experience_level=current_user.experience_level or "intermedio",
        bodyweight=current_user.bodyweight,
        height=current_user.height,
        training_goal=current_user.training_goal or "hipertrofia",
        updated_at=current_user.updated_at,
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

