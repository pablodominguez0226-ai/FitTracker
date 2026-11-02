import datetime as dt
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models

from .catalog import MASTER_EXERCISES_CATALOG

DEFAULT_MUSCLE_GROUPS = [
    "Pecho",
    "Espalda",
    "Brazos",
    "Piernas",
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
    "Bíceps": [
        "Curl con barra Z",
        "Curl inclinado con mancuernas",
        "Curl martillo con mancuernas",
        "Curl en polea baja",
        "Curl predicador en máquina",
        "Curl predicador con barra Z",
    ],
    "Tríceps": [
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
    "press banca plano con barra": "Press de Banca Plano con Barra",
    "press plano con mancuernas": "Press de Banca Plano con Mancuernas",
    "press de pecho en máquina convergente": "Press de Pecho en Máquina",
    "press de pecho en máquina smith": "Press en Smith Plano",
    "press inclinado en máquina smith": "Press en Smith Inclinado",
    "press inclinado en máquina convergente": "Press de Pecho en Máquina",
    "fondos en paralelas para pecho": "Fondos en Paralelas (Pecho)",
    "fondos en paralelas": "Fondos en Paralelas (Pecho)",
    "aperturas en banco plano con mancuernas": "Aperturas Planas con Mancuernas",
    "aperturas en banco con mancuernas": "Aperturas Planas con Mancuernas",
    "aperturas con mancuernas en banco plano": "Aperturas Planas con Mancuernas",
    "cruces en polea alta (haz inferior)": "Cruces en Polea Alta",
    "cruces en polea baja (haz superior)": "Cruces en Polea Baja",
    "aperturas en máquina peck deck": "Pec Deck / Contractor",
    "flexiones de brazos lastradas": "Flexiones de Brazos (Push-Ups)",
    "dominadas": "Dominadas Prono",
    "jalón al pecho prono en polea alta": "Jalón al Pecho en Polea",
    "jalón al pecho en polea alta (prono)": "Jalón al Pecho en Polea",
    "jalón al pecho agarre neutro/estrecho": "Jalón al Pecho Agarre Neutro",
    "remo con barra (prono/supino)": "Remo Inclinado con Barra",
    "remo con barra inclinado": "Remo Inclinado con Barra",
    "remo pendlay con barra": "Remo Pendlay",
    "remo en t con apoyo en pecho": "Remo con Barra T",
    "remo en máquina t": "Remo con Barra T",
    "remo a una mano con mancuerna": "Remo Unilateral con Mancuerna",
    "remo con mancuerna a una mano": "Remo Unilateral con Mancuerna",
    "remo sentado en polea baja": "Remo en Polea Baja (Gironda)",
    "remo en polea baja sentado": "Remo en Polea Baja (Gironda)",
    "remo en máquina convergente": "Remo en Máquina",
    "peso muerto convencional con barra": "Peso Muerto Convencional",
    "hiperextensiones lumbares en banco": "Hiperextensiones Lumbar",
    "encogimientos con barra": "Encogimientos de Hombros con Barra",
    "press de hombros sentado con mancuernas": "Press de Hombros con Mancuernas",
    "press con mancuernas sentado": "Press de Hombros con Mancuernas",
    "elevaciones laterales en polea baja": "Elevaciones Laterales en Polea",
    "pájaros para deltoides posterior con mancuernas": "Pájaros con Mancuernas",
    "pájaros con mancuernas posterior": "Pájaros con Mancuernas",
    "face pulls en polea alta con cuerda": "Face Pull en Polea",
    "face pull en polea alta con cuerda": "Face Pull en Polea",
    "curl de bíceps con barra z": "Curl con Barra Z",
    "curl alterno con mancuernas": "Curl Alterno con Mancuernas",
    "curl alterno con mancuernas inclinado": "Curl en Banco Inclinado",
    "curl inclinado con mancuernas": "Curl en Banco Inclinado",
    "curl predicador con barra z": "Curl Predicador (Banco Scott)",
    "curl predicador barra z": "Curl Predicador (Banco Scott)",
    "curl predicador en máquina": "Curl Predicador (Banco Scott)",
    "curl concentrado con mancuerna": "Curl Concentrado",
    "extensiones en polea alta con cuerda": "Extensión de Tríceps con Cuerda",
    "extensión de tríceps en polea con cuerda": "Extensión de Tríceps con Cuerda",
    "extensión en polea con barra (pushdown)": "Extensión de Tríceps con Barra",
    "extensiones sobre la cabeza en polea (overhead)": "Extensión Trasnuca con Mancuerna",
    "fondos entre bancos / máquina": "Fondos en Paralelas (Tríceps)",
    "fondos de tríceps en banco/paralelas": "Fondos en Paralelas (Tríceps)",
    "patada de tríceps en polea": "Patada de Tríceps",
    "patada de tríceps con mancuerna": "Patada de Tríceps",
    "sentadilla trasera con barra (back squat)": "Sentadilla Trasera con Barra",
    "sentadilla trasera con barra": "Sentadilla Trasera con Barra",
    "prensa inclinada con discos": "Prensa de Piernas 45°",
    "prensa de piernas inclinada 45°": "Prensa de Piernas 45°",
    "prensa de piernas en máquina": "Prensa de Piernas 45°",
    "sentadilla hack en máquina": "Sentadilla Hack",
    "sentadilla hack con barra": "Sentadilla Hack",
    "zancadas caminando con mancuernas": "Zancadas / Estocadas con Mancuernas",
    "zancadas con mancuernas": "Zancadas / Estocadas con Mancuernas",
    "curl femoral acostado en máquina": "Curl Femoral Tumbado",
    "curl femoral tumbado en máquina": "Curl Femoral Tumbado",
    "curl femoral sentado en máquina": "Curl Femoral Sentado",
    "máquina de abductores": "Abducción de Cadera en Máquina",
    "máquina de aductores": "Aducción de Cadera en Máquina",
    "elevación de talones de pie en máquina": "Elevación de Gemelos de Pie",
    "elevación de talones sentado en máquina": "Elevación de Gemelos Sentado",
}


# Biomechanical technical guides for key exercises (Setup, Ejecución, Respiración, Tempo y Músculos)
EXERCISE_TECH_DATA: dict[str, dict[str, str]] = {
    "press banca plano con barra": {
        "target_tempo": "3-0-1-0 (3s excéntrica / 1s subida)",
        "primary_muscles": "Pectoral mayor (haz esternal y clavicular), tríceps, deltoides anterior",
        "execution_tips": "• Setup: Retracción escapular firme en banco, arco lumbar natural y pies plantados generando leg drive.\n• Ejecución: Descenso en 3s hacia el esternón inferior con codos a 45-70°; empuje explosivo sin despegar glúteos.\n• Respiración: Inhalar y bloquear caja torácica antes de descender; exhalar con fuerza al pasar el punto medio.",
    },
    "press inclinado con mancuernas": {
        "target_tempo": "3-1-1-0 (3s bajada / 1s pausa abajo)",
        "primary_muscles": "Pectoral mayor (porción clavicular superior), deltoides anterior, tríceps",
        "execution_tips": "• Setup: Banco a 30-45° con apoyo lumbar firme. Mancuernas alineadas a nivel clavicular con agarre semi-neutro.\n• Ejecución: Descenso en 3s sintiendo estiramiento pectoral; empuje convergente hacia el centro sin chocar mancuernas.\n• Respiración: Inhalar profundo inflando el tórax en la bajada; exhalar al superar el punto de estancamiento.",
    },
    "press inclinado con barra": {
        "target_tempo": "3-0-1-0 (3s bajada controlada)",
        "primary_muscles": "Pectoral clavicular superior, deltoides anterior, tríceps",
        "execution_tips": "• Setup: Banco a 30°, retracción de escápulas y agarre a 1.5 anchos de hombro.\n• Ejecución: Bajar la barra hacia la porción superior del pecho sin despegar la espalda alta; empuje vertical sólido.\n• Respiración: Inhalar antes de desbloquear la barra; exhalar en el último tercio del ascenso.",
    },
    "press declinado con barra": {
        "target_tempo": "3-0-1-0 (3s excéntrica constante)",
        "primary_muscles": "Pectoral mayor (haz costal inferior), tríceps braquial",
        "execution_tips": "• Setup: Piernas trabadas en los rodillos, escápulas retraídas contra el banco declinado.\n• Ejecución: Bajar la barra hacia la base de los pectorales manteniendo codos en ángulo de 45°.\n• Respiración: Inhalar conteniendo aire en la bajada; exhalar firmemente en la contracción concéntrica.",
    },
    "press plano con mancuernas": {
        "target_tempo": "3-1-1-0 (3s bajada / 1s estiramiento)",
        "primary_muscles": "Pectoral mayor, deltoides anterior, tríceps",
        "execution_tips": "• Setup: Espalda apoyada con retracción escapular, mancuernas sobre el pecho y codos en ángulo de flecha.\n• Ejecución: Bajar en 3s logrando máximo rango articular seguro; empujar convergente sin bloquear codos arriba.\n• Respiración: Inhalar llenando pulmones al abrir los brazos; exhalar al comprimir pectorales arriba.",
    },
    "aperturas en banco con mancuernas": {
        "target_tempo": "3-1-1-0 (3s apertura / 1s estiramiento)",
        "primary_muscles": "Pectoral mayor (estiramiento fascial profundo)",
        "execution_tips": "• Setup: Banco plano, codos con flexión fija constante (15-20°) durante toda la serie.\n• Ejecución: Abrir los brazos en arco hasta sentir elongación máxima del pecho; cerrar contrayendo sin juntar mancuernas.\n• Respiración: Inhalar hondo mientras se abren los brazos; exhalar al abrazar imaginariamente hacia arriba.",
    },
    "fondos en paralelas para pecho": {
        "target_tempo": "3-1-1-0 (3s bajada profunda / 1s pausa)",
        "primary_muscles": "Pectoral mayor inferior, tríceps, deltoides anterior",
        "execution_tips": "• Setup: Apoyo en paralelas con torso inclinado 30° hacia adelante y codos ligeramente hacia afuera.\n• Ejecución: Bajar hasta que los hombros queden por debajo del nivel de codos sin balancear el cuerpo.\n• Respiración: Inhalar en el descenso preservando estabilidad escapular; exhalar al extender brazos con fuerza.",
    },
    "aperturas en máquina peck deck": {
        "target_tempo": "3-0-1-1 (1s contracción isométrica al centro)",
        "primary_muscles": "Pectoral mayor (contracción en plano horizontal)",
        "execution_tips": "• Setup: Asiento graduado para que los mangos queden a la altura del pezón; espalda pegada al respaldo.\n• Ejecución: Juntar los brazos apretando el centro del pecho 1s; retornar en 3s controlando el peso de las placas.\n• Respiración: Exhalar en el cierre de brazos; inhalar en la apertura sin dejar que las placas golpeen.",
    },
    "sentadilla trasera con barra (back squat)": {
        "target_tempo": "3-1-1-0 (3s descenso / 1s paralelo)",
        "primary_muscles": "Cuádriceps, glúteo mayor, aductores, erectores espinales",
        "execution_tips": "• Setup: Barra fija en trapecios, pies al ancho de hombros con puntas a 20° y core completamente compactado.\n• Ejecución: Quebrar cadera y rodillas a la vez, bajando en 3s hasta romper la paralela; empujar el piso con toda la planta.\n• Respiración: Inhalar diafragmático creando presión intraabdominal máxima (Valsalva); exhalar tras superar el punto crítico.",
    },
    "sentadilla frontal con barra": {
        "target_tempo": "3-0-1-0 (3s bajada con torso vertical)",
        "primary_muscles": "Cuádriceps (recto femoral), glúteos, core anterior",
        "execution_tips": "• Setup: Barra apoyada sobre deltoides anteriores, codos elevados apuntando al frente en todo momento.\n• Ejecución: Descenso en 3s conservando el torso recto sin doblar muñecas; romper paralelo con codos altos.\n• Respiración: Inhalar inflando abdomen antes de descender; soltar aire al completar la extensión de rodillas.",
    },
    "prensa inclinada con discos": {
        "target_tempo": "3-0-1-0 (3s excéntrica sin despegar lumbar)",
        "primary_muscles": "Cuádriceps, glúteo mayor, isquiosurales",
        "execution_tips": "• Setup: Pies al ancho de hombros en el centro de la plataforma; espalda y glúteos sellados contra el respaldo.\n• Ejecución: Descender en 3s hasta 90° de rodilla sin despegar la pelvis del asiento; empujar sin trabar rodillas arriba.\n• Respiración: Inhalar en la bajada; exhalar al empujar la plataforma hacia arriba.",
    },
    "sentadilla búlgara con mancuernas": {
        "target_tempo": "3-0-1-0 (3s descenso unilateral controlado)",
        "primary_muscles": "Glúteo mayor, cuádriceps, estabilizadores de cadera",
        "execution_tips": "• Setup: Empeine trasero en banco, paso adelante amplio, torso con ligera inclinación al frente.\n• Ejecución: Bajar la rodilla trasera verticalmente hacia el suelo en 3s; subir empujando desde el talón delantero.\n• Respiración: Inhalar antes de bajar; exhalar al regresar a la posición vertical.",
    },
    "peso muerto convencional con barra": {
        "target_tempo": "2-1-1-0 (Subida potente / bajada guiada)",
        "primary_muscles": "Glúteos, isquiosurales, erectores espinales, dorsales, trapecio",
        "execution_tips": "• Setup: Pies al ancho de cadera, barra a 2cm de las tibias sobre el mediopié, agarre firme y dorsales tensos.\n• Ejecución: Empujar el piso con los talones manteniendo la barra en contacto con las piernas hasta bloquear caderas.\n• Respiración: Inhalación diafragmática profunda y braceo abdominal al suelo; exhalar arriba sin hiperextender lumbar.",
    },
    "peso muerto rumano con barra": {
        "target_tempo": "3-1-1-0 (3s bisagra excéntrica de isquios)",
        "primary_muscles": "Isquiotibiales (bíceps femoral, semitendinoso), glúteos, erectores",
        "execution_tips": "• Setup: Rodillas semiflexionadas (15°), columna neutra y hombros hacia atrás; barra rozando los muslos.\n• Ejecución: Empujar las caderas hacia la pared trasera mientras la barra desciende por debajo de rodillas en 3s.\n• Respiración: Inhalar y trabar abdomen al iniciar la bisagra; exhalar contrayendo glúteos al ponerse de pie.",
    },
    "peso muerto rumano con mancuernas": {
        "target_tempo": "3-1-1-0 (3s descenso con cadera atrás)",
        "primary_muscles": "Isquiosurales, glúteo mayor, lumbar",
        "execution_tips": "• Setup: Pies a ancho de cadera, mancuernas frente a muslos, rodillas con ligera flexión fija.\n• Ejecución: Desplazar la cadera hacia atrás en 3s sintiendo tensión en isquios; subir activando glúteos.\n• Respiración: Inhalar en el descenso de cadera; exhalar contrayendo glúteos arriba.",
    },
    "hip thrust con barra": {
        "target_tempo": "2-0-1-2 (2s contracción isométrica arriba)",
        "primary_muscles": "Glúteo mayor (contracción concéntrica máxima), isquiotibiales",
        "execution_tips": "• Setup: Espalda media apoyada en el banco, barra sobre la cadera acolchada, pies a 90° respecto a rodillas arriba.\n• Ejecución: Extender cadera empujando con talones hasta la horizontal; apretar glúteos 2s manteniendo barbilla al pecho.\n• Respiración: Inhalar abajo en la flexión; exhalar con fuerza al elevar y bloquear la pelvis arriba.",
    },
    "curl femoral acostado en máquina": {
        "target_tempo": "3-0-1-1 (3s bajada / 1s contracción en glúteo)",
        "primary_muscles": "Isquiosurales (bíceps femoral cabeza corta y larga)",
        "execution_tips": "• Setup: Rodillo justo por encima de los talones; alinear eje de la rodilla con el pivote de la máquina.\n• Ejecución: Flexionar talones hacia glúteos en 1s contrayendo fuerte; descender en 3s resistiendo la carga.\n• Respiración: Exhalar al flexionar rodillas; inhalar durante el descenso lento de las placas.",
    },
    "extensión de cuádriceps en máquina": {
        "target_tempo": "3-0-1-1 (1s bloqueo arriba / 3s bajada)",
        "primary_muscles": "Cuádriceps (énfasis recto femoral y vastos)",
        "execution_tips": "• Setup: Rodillo sobre la parte baja de las tibias, espalda pegada al respaldo y rodillas alineadas con el eje.\n• Ejecución: Extender piernas en 1s hasta bloquear suavemente; descender en 3s resistiendo sin dejar caer el peso.\n• Respiración: Exhalar en la extensión hacia adelante; inhalar mientras las rodillas vuelven a flexionarse.",
    },
    "elevación de talones de pie en máquina": {
        "target_tempo": "3-1-1-2 (2s contracción arriba / 1s estiramiento abajo)",
        "primary_muscles": "Gastrocnemio (gemelos medial y lateral)",
        "execution_tips": "• Setup: Metatarsos en el borde del escalón, almohadillas sobre hombros y rodillas casi rectas (sin bloqueo).\n• Ejecución: Bajar talones al máximo sintiendo el estiramiento; subir en 1s hasta la punta del pie y apretar 2s.\n• Respiración: Inhalar al estirar en el fondo; exhalar al elevar talones hacia el punto más alto.",
    },
    "remo con barra (prono/supino)": {
        "target_tempo": "2-0-1-1 (1s contracción escapular en esternón)",
        "primary_muscles": "Dorsal ancho, romboides, trapecio medio/inferior, bíceps",
        "execution_tips": "• Setup: Inclinación de torso a 45-60°, columna recta, rodillas semiflexionadas y agarre prono o supino firme.\n• Ejecución: Traccionar hacia el ombligo llevando codos pegados al cuerpo; apretar escápulas 1s sin balancear el torso.\n• Respiración: Inhalar estirando los brazos hacia el piso; exhalar contrayendo dorsales al llevar la barra al cuerpo.",
    },
    "remo pendlay con barra": {
        "target_tempo": "1-0-X-1 (Tirón explosivo desde el piso / pausa muerta)",
        "primary_muscles": "Dorsal ancho, romboides, erectores espinales, core",
        "execution_tips": "• Setup: Torso paralelo al suelo, barra apoyada en el piso en cada repetición y espalda completamente rígida.\n• Ejecución: Tirón explosivo despegando del suelo hacia el esternón bajo; retornar al suelo en cada repetición.\n• Respiración: Braceo abdominal e inhalación al suelo; exhalación explosiva durante la tracción.",
    },
    "remo a una mano con mancuerna": {
        "target_tempo": "3-0-1-1 (3s excéntrica / codo hacia la cadera)",
        "primary_muscles": "Dorsal ancho, redondo mayor, bíceps braquial",
        "execution_tips": "• Setup: Mano y rodilla de apoyo en banco plano, espalda recta horizontal y mancuerna bajo el hombro.\n• Ejecución: Traccionar guiando con el codo hacia la cadera (trayectoria arqueada) en 1s; descender en 3s controlando.\n• Respiración: Inhalar al estirar el dorsal en el fondo; exhalar al acercar el codo a la cresta ilíaca.",
    },
    "remo sentado en polea baja": {
        "target_tempo": "3-0-1-1 (3s bajada / 1s apriete de escápulas)",
        "primary_muscles": "Dorsal ancho, romboides, trapecio medio",
        "execution_tips": "• Setup: Pies firmes en apoyos, rodillas semiflexionadas, torso erguido perpendicular al suelo.\n• Ejecución: Traccionar el maneral hacia el abdomen bajo juntando escápulas; no hiperflexionar ni balancear la columna.\n• Respiración: Inhalar extendiendo brazos hacia adelante; exhalar al remar hacia el ombligo.",
    },
    "remo en t con apoyo en pecho": {
        "target_tempo": "3-0-1-1 (3s bajada / tracción estricta sin inercia)",
        "primary_muscles": "Espalda alta, romboides, trapecios, deltoides posterior",
        "execution_tips": "• Setup: Pecho firme contra la almohadilla, pies bien apoyados para anclar la postura.\n• Ejecución: Tirar con los codos hacia atrás sintiendo la espalda alta; resistir la gravedad en 3s al descender.\n• Respiración: Inhalar al estirar brazos; exhalar al contraer escápulas contra el soporte.",
    },
    "jalón al pecho prono en polea alta": {
        "target_tempo": "3-0-1-1 (3s excéntrica / 1s contacto en clavícula)",
        "primary_muscles": "Dorsal ancho, redondo mayor, bíceps",
        "execution_tips": "• Setup: Muslos ajustados bajo rodillos, leve inclinación dorsal (10-15°) y agarre prono un poco más ancho que hombros.\n• Ejecución: Bajar escápulas primero y tirar con los codos hacia las costillas hasta rozar el pecho alto; subir en 3s.\n• Respiración: Inhalar estirando dorsales con brazos arriba; exhalar al descender la barra controladamente.",
    },
    "jalón al pecho agarre neutro/estrecho": {
        "target_tempo": "3-0-1-1 (3s bajada / codos hacia adelante)",
        "primary_muscles": "Dorsal ancho (porción inferior e ilíaca), bíceps braquial",
        "execution_tips": "• Setup: Maneral en V o neutro, torso erguido con ligera inclinación hacia atrás.\n• Ejecución: Tirar llevando los codos hacia abajo y al frente rozando el tórax; apretar 1s y resistir la subida en 3s.\n• Respiración: Inhalar al permitir que la polea suba; exhalar al acercar el agarre al pecho.",
    },
    "dominadas": {
        "target_tempo": "3-0-1-1 (3s bajada estricta / mentón sobre la barra)",
        "primary_muscles": "Dorsal ancho, bíceps, braquiorradial, romboides",
        "execution_tips": "• Setup: Agarre prono abierto, colgado con brazos extendidos y hombros activos (lejos de orejas).\n• Ejecución: Traccionar llevando el pecho hacia la barra sin patear ni balancear piernas; bajar en 3s hasta extensión total.\n• Respiración: Inhalar abajo activando el core; exhalar durante el ascenso superando la barra.",
    },
    "press militar de pie con barra": {
        "target_tempo": "2-0-1-0 (2s descenso a clavículas)",
        "primary_muscles": "Deltoides anterior y lateral, tríceps braquial, trapecio superior, core",
        "execution_tips": "• Setup: Barra en clavículas, agarre justo por fuera de hombros, glúteos y abdomen apretados como un bloque.\n• Ejecución: Empujar verticalmente inclinando apenas la cabeza atrás; meter la cabeza al frente al bloquear arriba.\n• Respiración: Inhalar hondo y tensar abdomen antes de empujar; exhalar al extender brazos sobre la cabeza.",
    },
    "press de hombros sentado con mancuernas": {
        "target_tempo": "3-0-1-0 (3s bajada a nivel de orejas)",
        "primary_muscles": "Deltoides anterior, deltoides lateral, tríceps",
        "execution_tips": "• Setup: Banco a 80°, mancuernas a la altura de las orejas con codos a 60° del plano del torso.\n• Ejecución: Empujar verticalmente hacia arriba sin chocar mancuernas; descender en 3s hasta la altura de las orejas.\n• Respiración: Inhalar al descender con control; exhalar con energía al subir las mancuernas.",
    },
    "elevaciones laterales con mancuernas": {
        "target_tempo": "2-0-1-1 (1s parada isométrica en la horizontal)",
        "primary_muscles": "Deltoides lateral (cabeza media del hombro)",
        "execution_tips": "• Setup: Inclinación ligera de torso (10-15°), codos con microflexión fija y mancuernas a los costados.\n• Ejecución: Elevar por el plano escapular guiando con los codos hasta la altura de los hombros; no usar balanceo de piernas.\n• Respiración: Inhalar abajo; exhalar al elevar y sostener 1s en la cúspide.",
    },
    "face pulls en polea alta con cuerda": {
        "target_tempo": "2-0-1-2 (2s rotación externa y contracción posterior)",
        "primary_muscles": "Deltoides posterior, manguito rotador (infraespinoso), trapecio medio",
        "execution_tips": "• Setup: Polea a la altura de los ojos con cuerda, pulgares apuntando hacia atrás.\n• Ejecución: Tirar de la cuerda hacia los ojos/frente separando las manos y rotando los hombros externamente; pausar 2s.\n• Respiración: Inhalar extendiendo brazos; exhalar con fuerza al traccionar y separar las manos.",
    },
    "pájaros para deltoides posterior con mancuernas": {
        "target_tempo": "2-0-1-1 (1s pico de contracción posterior)",
        "primary_muscles": "Deltoides posterior, romboides",
        "execution_tips": "• Setup: Torso flexionado a 90° paralelo al suelo, rodillas semiflexionadas y mancuernas bajo el pecho.\n• Ejecución: Abrir los brazos hacia los lados en cruz guiando con los codos sin encoger el cuello ni usar inercia.\n• Respiración: Inhalar en el centro; exhalar al elevar los brazos lateralmente.",
    },
    "curl con barra z": {
        "target_tempo": "3-0-1-1 (3s excéntrica / 1s pico de contracción)",
        "primary_muscles": "Bíceps braquial, braquial anterior, braquiorradial",
        "execution_tips": "• Setup: Agarre en la curva interna de la barra Z, codos pegados a los costados del tronco y hombros hacia atrás.\n• Ejecución: Flexionar codos subiendo la barra hasta el pecho sin adelantar codos ni arquear la columna lumbar.\n• Respiración: Inhalar al descender la barra en 3s estirando el bíceps; exhalar al flexionar hacia arriba.",
    },
    "curl inclinado con mancuernas": {
        "target_tempo": "3-1-1-0 (3s bajada con estiramiento fascial profundo)",
        "primary_muscles": "Bíceps braquial (cabeza larga en máxima elongación)",
        "execution_tips": "• Setup: Banco inclinado a 45-60°, espalda apoyada, brazos colgando en vertical sintiendo tensión inicial.\n• Ejecución: Subir supinando las muñecas manteniendo los codos apuntando hacia el suelo sin adelantarlos.\n• Respiración: Inhalar en el descenso de 3s; exhalar mientras se contrae y gira la mancuerna arriba.",
    },
    "curl martillo con mancuernas": {
        "target_tempo": "3-0-1-0 (3s excéntrica / agarre neutro firme)",
        "primary_muscles": "Braquiorradial, braquial anterior, bíceps braquial",
        "execution_tips": "• Setup: Mancuernas sostenidas con palmas mirándose entre sí (agarre neutro), postura erguida.\n• Ejecución: Elevar las mancuernas manteniendo las palmas enfrentadas en todo momento; bajar en 3s controlados.\n• Respiración: Inhalar al bajar las mancuernas; exhalar al flexionar los codos hacia arriba.",
    },
    "curl predicador con barra z": {
        "target_tempo": "3-0-1-1 (3s excéntrica estricta / no hiperextender codos)",
        "primary_muscles": "Bíceps braquial (aislamiento estricto, cabeza corta)",
        "execution_tips": "• Setup: Axilas calzadas en el vértice del banco Scott, brazos apoyados por completo en el cojín.\n• Ejecución: Subir hasta máxima contracción; bajar en 3s frenando antes del bloqueo articular de los codos.\n• Respiración: Inhalar en el descenso controlado; exhalar al subir flexionando los antebrazos.",
    },
    "press francés con barra z": {
        "target_tempo": "3-1-1-0 (3s descenso a la frente / codos cerrados)",
        "primary_muscles": "Tríceps braquial (porción larga y medial)",
        "execution_tips": "• Setup: Acostado en banco plano, barra Z sobre el pecho con brazos inclinados 10° hacia atrás de la vertical.\n• Ejecución: Flexionar únicamente los codos bajando la barra hacia la coronilla en 3s; extender con tríceps.\n• Respiración: Inhalar al flexionar codos hacia atrás; exhalar al empujar extendiendo los antebrazos.",
    },
    "extensiones en polea alta con cuerda": {
        "target_tempo": "3-0-1-1 (3s excéntrica / 1s separación de cuerda abajo)",
        "primary_muscles": "Tríceps braquial (cabeza lateral y medial)",
        "execution_tips": "• Setup: Codos pegados a las costillas, ligera inclinación de cadera y cuerda tomada por los extremos.\n• Ejecución: Extender brazos hacia abajo separando los extremos de la cuerda al final; subir en 3s hasta 90°.\n• Respiración: Inhalar al permitir que las manos suban al pecho; exhalar al extender y abrir la cuerda abajo.",
    },
    "extensión en polea con barra (pushdown)": {
        "target_tempo": "3-0-1-1 (3s excéntrica / 1s bloqueo de tríceps)",
        "primary_muscles": "Tríceps braquial (cabeza lateral y medial)",
        "execution_tips": "• Setup: Codos anclados al torso, agarre prono firme en la barra recta o en V.\n• Ejecución: Empujar la barra verticalmente hacia abajo bloqueando tríceps 1s; regresar en 3s sin mover los codos.\n• Respiración: Inhalar al subir la barra al nivel del pecho; exhalar al presionar hacia abajo.",
    },
    "fondos entre bancos / máquina": {
        "target_tempo": "3-1-1-0 (3s descenso / hombros protegidos)",
        "primary_muscles": "Tríceps braquial, deltoides anterior",
        "execution_tips": "• Setup: Manos apoyadas detrás de la cadera a ancho de hombros, piernas al frente y torso vertical.\n• Ejecución: Flexionar codos hacia atrás bajando en 3s sin que los hombros roten hacia adelante; extender con tríceps.\n• Respiración: Inhalar al descender pelvis hacia el piso; exhalar al empujar hacia la posición inicial.",
    },
}

STABLE_EXERCISE_IMAGES: dict[str, str] = {
    # Pecho
    "press banca plano con barra": "https://upload.wikimedia.org/wikipedia/commons/9/9c/Bench-press-1.png",
    "press plano con mancuernas": "/assets/diagrams/pecho.svg",
    "press inclinado con barra": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Bench_press_2.svg/800px-Bench_press_2.svg.png",
    "press inclinado con mancuernas": "/assets/diagrams/pecho.svg",
    "press declinado con barra": "/assets/diagrams/pecho.svg",
    "fondos en paralelas para pecho": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Dips.svg/800px-Dips.svg.png",
    "aperturas en banco con mancuernas": "/assets/diagrams/pecho.svg",
    "cruces en polea alta (haz inferior)": "/assets/diagrams/pecho.svg",
    # Espalda
    "peso muerto convencional con barra": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Deadlift.svg/800px-Deadlift.svg.png",
    "dominadas": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Pull-up-1.svg/800px-Pull-up-1.svg.png",
    "remo con barra (prono/supino)": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bent-over-row-1.png/800px-Bent-over-row-1.png",
    "remo pendlay con barra": "/assets/diagrams/espalda.svg",
    "jalón al pecho prono en polea alta": "/assets/diagrams/espalda.svg",
    "peso muerto rumano con barra": "/assets/diagrams/espalda.svg",
    # Pierna
    "sentadilla trasera con barra (back squat)": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Squats.svg/800px-Squats.svg.png",
    "sentadilla frontal con barra": "/assets/diagrams/pierna.svg",
    "prensa inclinada con discos": "/assets/diagrams/pierna.svg",
    "hip thrust con barra": "/assets/diagrams/pierna.svg",
    "curl femoral acostado en máquina": "/assets/diagrams/pierna.svg",
    "extensión de cuádriceps en máquina": "/assets/diagrams/pierna.svg",
    "elevación de talones de pie en máquina": "/assets/diagrams/pierna.svg",
    # Hombro
    "press militar de pie con barra": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Overhead-press-1.svg/800px-Overhead-press-1.svg.png",
    "press de hombros sentado con mancuernas": "/assets/diagrams/hombro.svg",
    "elevaciones laterales con mancuernas": "/assets/diagrams/hombro.svg",
    "pájaros para deltoides posterior con mancuernas": "/assets/diagrams/hombro.svg",
    "face pulls en polea alta con cuerda": "/assets/diagrams/hombro.svg",
    # Bíceps y Tríceps
    "curl con barra z": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Biceps-curl-1.png/800px-Biceps-curl-1.png",
    "curl martillo con mancuernas": "/assets/diagrams/biceps.svg",
    "press francés con barra z": "/assets/diagrams/triceps.svg",
    "extensiones en polea alta con cuerda": "/assets/diagrams/triceps.svg",
    "extensión en polea con barra (pushdown)": "/assets/diagrams/triceps.svg",
    # Core
    "crunch abdominal en máquina": "/assets/diagrams/core.svg",
    "elevación de piernas colgado": "/assets/diagrams/core.svg",
    "plancha isométrica": "/assets/diagrams/core.svg",
    "rueda abdominal (ab wheel)": "/assets/diagrams/core.svg",
}


def get_default_image_for_exercise(name: str, muscle_group_name: str | None = None) -> str:
    key = (name or "").strip().lower()
    if key in STABLE_EXERCISE_IMAGES:
        return STABLE_EXERCISE_IMAGES[key]

    for k, v in STABLE_EXERCISE_IMAGES.items():
        if k in key or key in k:
            return v

    mg = (muscle_group_name or "").strip().lower()
    if "pecho" in mg or "pectoral" in mg:
        return "/assets/diagrams/pecho.svg"
    elif "espalda" in mg or "dorsal" in mg:
        return "/assets/diagrams/espalda.svg"
    elif "pierna" in mg or "cuádriceps" in mg or "cuadriceps" in mg or "isquios" in mg:
        return "/assets/diagrams/pierna.svg"
    elif "hombro" in mg or "deltoid" in mg:
        return "/assets/diagrams/hombro.svg"
    elif "bíceps" in mg or "biceps" in mg:
        return "/assets/diagrams/biceps.svg"
    elif "tríceps" in mg or "triceps" in mg:
        return "/assets/diagrams/triceps.svg"
    elif "core" in mg or "abdom" in mg:
        return "/assets/diagrams/core.svg"
    return "/assets/diagrams/pecho.svg"


def seed_initial_data(db: Session) -> None:
    # 1. Asegurar la existencia de los 4 grupos musculares maestros: Pecho, Espalda, Brazos, Piernas
    group_map: dict[str, models.MuscleGroup] = {}
    for group_name in DEFAULT_MUSCLE_GROUPS:
        variations = [group_name.lower(), group_name.lower().rstrip("s"), group_name.lower() + "s"]
        group = (
            db.query(models.MuscleGroup)
            .filter(func.lower(models.MuscleGroup.name).in_(variations))
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
        group_map[group_name.lower().rstrip("s")] = group
        group_map[group_name.lower()] = group

    # 2. Precargar o actualizar catálogo maestro de ejercicios de forma estrictamente idempotente
    official_names_set = set()
    official_slugs_set = set()

    for item in MASTER_EXERCISES_CATALOG:
        group_name = item["muscle_group"]
        group = group_map.get(group_name) or group_map.get(group_name.lower()) or group_map.get(group_name.lower().rstrip("s"))
        if not group:
            continue

        slug = item["slug"]
        name = item["name"]
        subgroup = item["subgroup"]
        media_url = item["media_url"]
        official_names_set.add(name.strip().lower())
        official_slugs_set.add(slug.strip().lower())

        # 2.1 Buscar coincidencia por slug o nombre canónico
        canonical_ex = (
            db.query(models.Exercise)
            .filter(
                (func.lower(models.Exercise.slug) == slug.strip().lower())
                | (func.lower(models.Exercise.name) == name.strip().lower())
            )
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
                db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == canonical_ex.id).update(
                    {"exercise_id": alias_ex.id}
                )
                db.query(models.RoutineExercise).filter(models.RoutineExercise.exercise_id == canonical_ex.id).update(
                    {"exercise_id": alias_ex.id}
                )
                db.delete(canonical_ex)
                db.flush()
                alias_ex.name = name
                alias_ex.muscle_group_id = group.id
                alias_ex.is_active = True
                existing = alias_ex
            else:
                db.query(models.WorkoutSet).filter(models.WorkoutSet.exercise_id == alias_ex.id).update(
                    {"exercise_id": canonical_ex.id}
                )
                db.query(models.RoutineExercise).filter(models.RoutineExercise.exercise_id == alias_ex.id).update(
                    {"exercise_id": canonical_ex.id}
                )
                db.delete(alias_ex)
                db.flush()
                canonical_ex.muscle_group_id = group.id
                canonical_ex.is_active = True
                existing = canonical_ex
        elif canonical_ex:
            canonical_ex.name = name
            canonical_ex.muscle_group_id = group.id
            canonical_ex.is_active = True
            existing = canonical_ex
        elif alias_ex:
            alias_ex.name = name
            alias_ex.muscle_group_id = group.id
            alias_ex.is_active = True
            existing = alias_ex
        else:
            existing = None

        if existing:
            existing.slug = slug
            existing.subgroup = subgroup
            existing.equipment_type = None
            existing.mechanics_type = item.get("mechanics_type", "compuesto")
            existing.key_cue = item["key_cue"]
            existing.target_tempo = item["target_tempo"]
            existing.primary_muscles = subgroup
            existing.execution_tips = item["execution_tips"]
            existing.muscle_group_id = group.id
            existing.image_url = media_url
            existing.is_active = True
        else:
            new_ex = models.Exercise(
                slug=slug,
                name=name,
                subgroup=subgroup,
                muscle_group_id=group.id,
                is_active=True,
                equipment_type=None,
                mechanics_type=item.get("mechanics_type", "compuesto"),
                key_cue=item["key_cue"],
                target_tempo=item["target_tempo"],
                primary_muscles=subgroup,
                execution_tips=item["execution_tips"],
                image_url=media_url,
            )
            db.add(new_ex)

    db.flush()

    # 3. Asignación de replacement_id para cada ejercicio del catálogo
    all_ex_dict = {
        ex.name.strip().lower(): ex
        for ex in db.query(models.Exercise).all()
    }

    for item in MASTER_EXERCISES_CATALOG:
        curr_ex = all_ex_dict.get(item["name"].strip().lower())
        rep_target = all_ex_dict.get(item["replacement_name"].strip().lower())
        if curr_ex and rep_target and curr_ex.id != rep_target.id:
            curr_ex.replacement_id = rep_target.id

    # 4. Asignar replacement_id a cualquier otro ejercicio activo que no lo tenga aún
    active_exercises = db.query(models.Exercise).filter(models.Exercise.is_active == True).all()
    for ex in active_exercises:
        if not ex.replacement_id:
            # Buscar otro ejercicio del mismo grupo muscular
            partner = (
                db.query(models.Exercise)
                .filter(
                    models.Exercise.muscle_group_id == ex.muscle_group_id,
                    models.Exercise.id != ex.id,
                    models.Exercise.is_active == True,
                )
                .first()
            )
            if partner:
                ex.replacement_id = partner.id

    db.flush()

    # 5. Desactivar ejercicios antiguos que no pertenezcan al catálogo maestro unificado
    # (se preservan en DB si tienen series registradas para no romper el historial)
    all_exercises = db.query(models.Exercise).all()
    for ex in all_exercises:
        ex_name_low = (ex.name or "").strip().lower()
        ex_slug_low = (ex.slug or "").strip().lower()
        if ex_name_low not in official_names_set and ex_slug_low not in official_slugs_set:
            ex.is_active = False

    db.commit()

    cleanup_preset_routines(db)
    # Desactivado definitivamente: nunca insertar sesiones ni series ficticias
    # seed_community_activity(db)
    seed_food_items(db)


def cleanup_preset_routines(db: Session) -> None:
    """
    Limpia de forma definitiva cualquier rutina preset o de Heavy Duty / Torso A / Pierna A.
    Garantiza que la tabla routines y routine_exercises quede limpia sin recreaciones automáticas.
    """
    old_presets = db.query(models.Routine).filter(models.Routine.is_preset == True).all()
    for old_r in old_presets:
        db.query(models.RoutineExercise).filter(models.RoutineExercise.routine_id == old_r.id).delete()
        db.delete(old_r)

    residual_routines = db.query(models.Routine).filter(
        (models.Routine.name.ilike("%Heavy Duty%")) |
        (models.Routine.name.ilike("%Torso A%")) |
        (models.Routine.name.ilike("%Pierna A%"))
    ).all()
    for r in residual_routines:
        db.query(models.RoutineExercise).filter(models.RoutineExercise.routine_id == r.id).delete()
        db.delete(r)

    db.commit()


def seed_community_activity(db: Session) -> None:
    """
    Desactivado definitivamente: nunca inyectar sesiones o series mock en workout_sessions ni workout_sets.
    """
    return


ARGENTINE_FOOD_CATALOG = [
    # Carnes Vaca
    {
        "name": "Carne picada especial",
        "category": "carnes_vaca",
        "calories_100g": 170.0,
        "protein_100g": 22.0,
        "carbs_100g": 0.0,
        "fat_100g": 9.0,
        "serving_unit": "porción (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Bola de lomo / Nalga",
        "category": "carnes_vaca",
        "calories_100g": 135.0,
        "protein_100g": 24.0,
        "carbs_100g": 0.0,
        "fat_100g": 4.0,
        "serving_unit": "bife (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Bife de cuadril",
        "category": "carnes_vaca",
        "calories_100g": 150.0,
        "protein_100g": 23.0,
        "carbs_100g": 0.0,
        "fat_100g": 6.0,
        "serving_unit": "bife (~200g)",
        "serving_weight_g": 200.0,
    },
    {
        "name": "Vacío",
        "category": "carnes_vaca",
        "calories_100g": 210.0,
        "protein_100g": 20.0,
        "carbs_100g": 0.0,
        "fat_100g": 14.0,
        "serving_unit": "porción (~200g)",
        "serving_weight_g": 200.0,
    },
    {
        "name": "Asado de tira",
        "category": "carnes_vaca",
        "calories_100g": 250.0,
        "protein_100g": 19.0,
        "carbs_100g": 0.0,
        "fat_100g": 19.0,
        "serving_unit": "tira (~250g)",
        "serving_weight_g": 250.0,
    },
    {
        "name": "Peceto",
        "category": "carnes_vaca",
        "calories_100g": 120.0,
        "protein_100g": 23.0,
        "carbs_100g": 0.0,
        "fat_100g": 3.0,
        "serving_unit": "fetas (~150g)",
        "serving_weight_g": 150.0,
    },
    # Pollo
    {
        "name": "Pechuga de pollo",
        "category": "carnes_pollo",
        "calories_100g": 120.0,
        "protein_100g": 26.0,
        "carbs_100g": 0.0,
        "fat_100g": 1.8,
        "serving_unit": "filete (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Pata muslo sin piel",
        "category": "carnes_pollo",
        "calories_100g": 160.0,
        "protein_100g": 22.0,
        "carbs_100g": 0.0,
        "fat_100g": 8.0,
        "serving_unit": "unidad (~200g)",
        "serving_weight_g": 200.0,
    },
    {
        "name": "Pata muslo con piel",
        "category": "carnes_pollo",
        "calories_100g": 215.0,
        "protein_100g": 18.0,
        "carbs_100g": 0.0,
        "fat_100g": 15.0,
        "serving_unit": "unidad (~220g)",
        "serving_weight_g": 220.0,
    },
    {
        "name": "Suprema rebozada",
        "category": "carnes_pollo",
        "calories_100g": 195.0,
        "protein_100g": 20.0,
        "carbs_100g": 11.0,
        "fat_100g": 7.0,
        "serving_unit": "unidad (~180g)",
        "serving_weight_g": 180.0,
    },
    # Cerdo
    {
        "name": "Solomillo de cerdo magro",
        "category": "carnes_cerdo",
        "calories_100g": 140.0,
        "protein_100g": 24.0,
        "carbs_100g": 0.0,
        "fat_100g": 4.5,
        "serving_unit": "medallón (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Carré de cerdo",
        "category": "carnes_cerdo",
        "calories_100g": 180.0,
        "protein_100g": 21.0,
        "carbs_100g": 0.0,
        "fat_100g": 10.0,
        "serving_unit": "chuleta (~180g)",
        "serving_weight_g": 180.0,
    },
    {
        "name": "Bondiola de cerdo",
        "category": "carnes_cerdo",
        "calories_100g": 230.0,
        "protein_100g": 18.0,
        "carbs_100g": 0.0,
        "fat_100g": 17.0,
        "serving_unit": "bife (~200g)",
        "serving_weight_g": 200.0,
    },
    {
        "name": "Pechito de cerdo",
        "category": "carnes_cerdo",
        "calories_100g": 260.0,
        "protein_100g": 17.0,
        "carbs_100g": 0.0,
        "fat_100g": 21.0,
        "serving_unit": "porción (~200g)",
        "serving_weight_g": 200.0,
    },
    # Verduras (Puras en crudo sin métodos de cocción)
    {
        "name": "Zapallo coreano",
        "category": "verduras",
        "calories_100g": 32.0,
        "protein_100g": 1.0,
        "carbs_100g": 7.0,
        "fat_100g": 0.2,
        "serving_unit": "rodaja (~100g)",
        "serving_weight_g": 100.0,
    },
    {
        "name": "Zanahoria",
        "category": "verduras",
        "calories_100g": 35.0,
        "protein_100g": 0.8,
        "carbs_100g": 8.0,
        "fat_100g": 0.2,
        "serving_unit": "unidad chica (~80g)",
        "serving_weight_g": 80.0,
    },
    {
        "name": "Papa",
        "category": "verduras",
        "calories_100g": 77.0,
        "protein_100g": 2.0,
        "carbs_100g": 17.0,
        "fat_100g": 0.1,
        "serving_unit": "unidad mediana (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Batata",
        "category": "verduras",
        "calories_100g": 86.0,
        "protein_100g": 1.6,
        "carbs_100g": 20.0,
        "fat_100g": 0.1,
        "serving_unit": "unidad (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Espinaca",
        "category": "verduras",
        "calories_100g": 23.0,
        "protein_100g": 2.9,
        "carbs_100g": 3.6,
        "fat_100g": 0.4,
        "serving_unit": "taza (~100g)",
        "serving_weight_g": 100.0,
    },
    {
        "name": "Tomate redondo",
        "category": "verduras",
        "calories_100g": 18.0,
        "protein_100g": 0.9,
        "carbs_100g": 3.9,
        "fat_100g": 0.2,
        "serving_unit": "unidad (~120g)",
        "serving_weight_g": 120.0,
    },
    {
        "name": "Morrón rojo",
        "category": "verduras",
        "calories_100g": 26.0,
        "protein_100g": 1.0,
        "carbs_100g": 6.0,
        "fat_100g": 0.3,
        "serving_unit": "unidad (~100g)",
        "serving_weight_g": 100.0,
    },
    {
        "name": "Cebolla",
        "category": "verduras",
        "calories_100g": 40.0,
        "protein_100g": 1.1,
        "carbs_100g": 9.3,
        "fat_100g": 0.1,
        "serving_unit": "unidad (~100g)",
        "serving_weight_g": 100.0,
    },
    {
        "name": "Brócoli",
        "category": "verduras",
        "calories_100g": 34.0,
        "protein_100g": 2.8,
        "carbs_100g": 6.6,
        "fat_100g": 0.4,
        "serving_unit": "taza (~100g)",
        "serving_weight_g": 100.0,
    },
    {
        "name": "Calabaza",
        "category": "verduras",
        "calories_100g": 26.0,
        "protein_100g": 1.0,
        "carbs_100g": 6.5,
        "fat_100g": 0.1,
        "serving_unit": "porción (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Lechuga",
        "category": "verduras",
        "calories_100g": 15.0,
        "protein_100g": 1.4,
        "carbs_100g": 2.9,
        "fat_100g": 0.2,
        "serving_unit": "planta chica (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Zapallito",
        "category": "verduras",
        "calories_100g": 17.0,
        "protein_100g": 1.2,
        "carbs_100g": 3.1,
        "fat_100g": 0.2,
        "serving_unit": "unidad (~150g)",
        "serving_weight_g": 150.0,
    },
    # Frutas
    {
        "name": "Banana",
        "category": "frutas",
        "calories_100g": 89.0,
        "protein_100g": 1.1,
        "carbs_100g": 23.0,
        "fat_100g": 0.3,
        "serving_unit": "unidad (~120g)",
        "serving_weight_g": 120.0,
    },
    {
        "name": "Manzana",
        "category": "frutas",
        "calories_100g": 52.0,
        "protein_100g": 0.3,
        "carbs_100g": 14.0,
        "fat_100g": 0.2,
        "serving_unit": "unidad (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Naranja",
        "category": "frutas",
        "calories_100g": 47.0,
        "protein_100g": 0.9,
        "carbs_100g": 12.0,
        "fat_100g": 0.1,
        "serving_unit": "unidad (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Frutillas",
        "category": "frutas",
        "calories_100g": 32.0,
        "protein_100g": 0.7,
        "carbs_100g": 7.7,
        "fat_100g": 0.3,
        "serving_unit": "taza (~150g)",
        "serving_weight_g": 150.0,
    },
    # Legumbres
    {
        "name": "Lentejas cocidas",
        "category": "legumbres",
        "calories_100g": 116.0,
        "protein_100g": 9.0,
        "carbs_100g": 20.0,
        "fat_100g": 0.4,
        "serving_unit": "plato hondo (~200g)",
        "serving_weight_g": 200.0,
    },
    {
        "name": "Garbanzos cocidos",
        "category": "legumbres",
        "calories_100g": 164.0,
        "protein_100g": 8.9,
        "carbs_100g": 27.0,
        "fat_100g": 2.6,
        "serving_unit": "porción (~150g)",
        "serving_weight_g": 150.0,
    },
    # Cereales y Pastas
    {
        "name": "Arroz blanco cocido",
        "category": "cereales_pastas",
        "calories_100g": 130.0,
        "protein_100g": 2.7,
        "carbs_100g": 28.0,
        "fat_100g": 0.3,
        "serving_unit": "taza (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Arroz integral cocido",
        "category": "cereales_pastas",
        "calories_100g": 111.0,
        "protein_100g": 2.6,
        "carbs_100g": 23.0,
        "fat_100g": 0.9,
        "serving_unit": "taza (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Fideos guiseros/tallarines cocidos",
        "category": "cereales_pastas",
        "calories_100g": 140.0,
        "protein_100g": 5.0,
        "carbs_100g": 28.0,
        "fat_100g": 1.0,
        "serving_unit": "plato (~200g)",
        "serving_weight_g": 200.0,
    },
    {
        "name": "Polenta cocida",
        "category": "cereales_pastas",
        "calories_100g": 75.0,
        "protein_100g": 1.8,
        "carbs_100g": 16.0,
        "fat_100g": 0.4,
        "serving_unit": "plato (~250g)",
        "serving_weight_g": 250.0,
    },
    {
        "name": "Avena tradicional",
        "category": "cereales_pastas",
        "calories_100g": 370.0,
        "protein_100g": 14.0,
        "carbs_100g": 60.0,
        "fat_100g": 7.0,
        "serving_unit": "porción (~40g)",
        "serving_weight_g": 40.0,
    },
    # Clásicos & Variaciones
    {
        "name": "Puré de papa con agua",
        "category": "platos_clasicos",
        "calories_100g": 75.0,
        "protein_100g": 1.5,
        "carbs_100g": 17.0,
        "fat_100g": 0.2,
        "serving_unit": "porción (~200g)",
        "serving_weight_g": 200.0,
    },
    {
        "name": "Puré de papa con leche y manteca",
        "category": "platos_clasicos",
        "calories_100g": 125.0,
        "protein_100g": 2.0,
        "carbs_100g": 18.0,
        "fat_100g": 5.0,
        "serving_unit": "porción (~200g)",
        "serving_weight_g": 200.0,
    },
    {
        "name": "Puré de calabaza",
        "category": "platos_clasicos",
        "calories_100g": 45.0,
        "protein_100g": 1.2,
        "carbs_100g": 9.5,
        "fat_100g": 0.3,
        "serving_unit": "porción (~200g)",
        "serving_weight_g": 200.0,
    },
    {
        "name": "Milanesa de carne al horno",
        "category": "platos_clasicos",
        "calories_100g": 215.0,
        "protein_100g": 22.0,
        "carbs_100g": 14.0,
        "fat_100g": 7.5,
        "serving_unit": "unidad (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Milanesa de pollo al horno",
        "category": "platos_clasicos",
        "calories_100g": 195.0,
        "protein_100g": 24.0,
        "carbs_100g": 12.0,
        "fat_100g": 5.5,
        "serving_unit": "unidad (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Pastel de papa casero",
        "category": "platos_clasicos",
        "calories_100g": 150.0,
        "protein_100g": 10.0,
        "carbs_100g": 13.0,
        "fat_100g": 6.5,
        "serving_unit": "porción (~300g)",
        "serving_weight_g": 300.0,
    },
    {
        "name": "Ensalada mixta (lechuga, tomate, cebolla)",
        "category": "platos_clasicos",
        "calories_100g": 25.0,
        "protein_100g": 1.2,
        "carbs_100g": 4.5,
        "fat_100g": 0.2,
        "serving_unit": "plato (~150g)",
        "serving_weight_g": 150.0,
    },
    {
        "name": "Huevo duro / a la plancha",
        "category": "platos_clasicos",
        "calories_100g": 143.0,
        "protein_100g": 12.6,
        "carbs_100g": 0.7,
        "fat_100g": 9.5,
        "serving_unit": "unidad (~50g)",
        "serving_weight_g": 50.0,
    },
]


def seed_food_items(db: Session) -> None:
    """
    Precarga de forma estrictamente idempotente el catálogo de alimentos e
    ingredientes argentinos base en food_items.
    Garantiza catálogo puro sin métodos de cocción fijos en verduras y frutas.
    """
    # 1. Renombrar y actualizar alimentos legacy con nombres de cocción a alimentos puros en crudo
    legacy_renames = {
        "zapallo coreano / anco cocido": "Zapallo coreano",
        "papa cocida": "Papa",
        "batata al horno": "Batata",
        "espinaca cocida": "Espinaca",
        "brócoli al vapor": "Brócoli",
        "calabaza asada": "Calabaza",
        "pechuga de pollo a la plancha": "Pechuga de pollo",
        "picada especial": "Carne picada especial",
    }

    for old_name, new_name in legacy_renames.items():
        existing = db.query(models.FoodItem).filter(func.lower(models.FoodItem.name) == old_name).first()
        target = db.query(models.FoodItem).filter(func.lower(models.FoodItem.name) == new_name.lower()).first()
        if existing and not target:
            existing.name = new_name
            db.commit()
        elif existing and target and existing.id != target.id:
            db.query(models.DailyFoodLog).filter(models.DailyFoodLog.food_id == existing.id).update(
                {models.DailyFoodLog.food_id: target.id}
            )
            db.delete(existing)
            db.commit()

    # 2. Eliminar cualquier plato con cocción prefabricada dentro de verduras o ensaladas
    forbidden_terms = ["al horno", "al vapor", "cocid", "asada", "asado", "al aceite", "frit", "saltead"]
    items_to_clean = db.query(models.FoodItem).filter(
        (models.FoodItem.category == "verduras") | (models.FoodItem.category == "ensaladas")
    ).all()
    for item in items_to_clean:
        name_lower = item.name.lower()
        if item.category == "ensaladas" or any(term in name_lower for term in forbidden_terms):
            db.query(models.DailyFoodLog).filter(models.DailyFoodLog.food_id == item.id).update(
                {models.DailyFoodLog.food_id: None}
            )
            db.delete(item)
    db.commit()

    # 3. Precarga y actualización idempotente de alimentos oficiales
    existing_foods = {
        f.name.strip().lower(): f
        for f in db.query(models.FoodItem).all()
    }

    for item in ARGENTINE_FOOD_CATALOG:
        canonical_key = item["name"].strip().lower()
        food = existing_foods.get(canonical_key)

        if food:
            food.category = item["category"]
            food.calories_100g = item["calories_100g"]
            food.protein_100g = item["protein_100g"]
            food.carbs_100g = item["carbs_100g"]
            food.fat_100g = item["fat_100g"]
            food.serving_unit = item["serving_unit"]
            food.serving_weight_g = item["serving_weight_g"]
        else:
            new_food = models.FoodItem(
                name=item["name"],
                category=item["category"],
                calories_100g=item["calories_100g"],
                protein_100g=item["protein_100g"],
                carbs_100g=item["carbs_100g"],
                fat_100g=item["fat_100g"],
                serving_unit=item["serving_unit"],
                serving_weight_g=item["serving_weight_g"],
                created_at=dt.datetime.now(dt.timezone.utc),
            )
            db.add(new_food)

    db.commit()

