# FitTracker - Dark Purple Iron Edition

Aplicación personal de alto rendimiento para registrar entrenamientos en el gimnasio, enfocado 100% en **Grupos Musculares**, **Cargas de Peso**, **Series & Repeticiones** y **Récords Personales (PR)** con una interfaz optimizada *"Dark Purple Iron"*.

## Stack Tecnológico

- **Frontend**: React 19, Vite, TailwindCSS (Dark Purple Iron Theme), Lucide Icons, Axios, React Router.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn.
- **Base de datos**: SQLite persistente en `./data/fittracker.db`.
- **Infraestructura**: Docker Compose y Nginx Reverse Proxy.

## Jerarquía de Datos Simplificada

1. **`MuscleGroup`**: Grupos musculares principales (Pecho, Espalda, Pierna, Hombro, Brazos, Core).
2. **`Exercise`**: Ejercicios vinculados directamente a un grupo muscular (`muscle_group_id`).
3. **`WorkoutSession`**: Sesión de entrenamiento por fecha con notas opcionales.
4. **`WorkoutSet`**: Serie registrada con número de serie, peso (kg), repeticiones y estado completado.

## Endpoints de la API (`/api`)

- `GET /api/muscle-groups` & `POST /api/muscle-groups`: Listar y crear grupos musculares al instante.
- `GET /api/exercises?muscle_group_id=...` & `POST /api/exercises`: Listar ejercicios por músculo y agregar nuevos en 1 clic.
- `POST /api/workouts`: Guardar sesión de entrenamiento con sus series y cargas.
- `GET /api/workouts`: Consultar historial de sesiones guardadas.
- `GET /api/records`: Consultar el récord personal (PR) y el último peso levantado por ejercicio como referencia de superación.
- `GET /api/health`: Chequeo de estado para Docker healthcheck.

## Flujo de Usuario en el Gimnasio

1. **Pantalla Principal (Entrenar)**:
   - Vista limpia de la fecha actual.
   - Selector visual táctil de Grupo Muscular (tarjetas con glow morado).
   - Botón rápido `+ Músculo` para dar de alta nuevos grupos en cualquier momento.
2. **Selección y Creación Rápida de Ejercicios**:
   - Muestra los ejercicios del grupo seleccionado con 1 toque para sumar a la sesión.
   - Input rápido con botón `+ Ejercicio` para crear y añadir ejercicios sin salir de pantalla.
3. **Registro de Cargas (In-Workout)**:
   - Tarjetas por ejercicio con visualización destacada de **PR** y **Último peso**.
   - Tabla clara: `[Set #] | [Peso (kg)] | [Reps] | [Botón Check/Listo]`.
   - Botón táctil `+ Agregar Serie`: auto-rellena con el peso y repeticiones de la serie previa para máxima velocidad de registro entre descansos.
4. **Cierre de Sesión**:
   - Resumen en tiempo real (volumen total en kg, series completadas).
   - Notas opcionales del día y guardado definitivo de la sesión.

## Despliegue con Docker Compose

```bash
docker compose up -d --build
```

La aplicación queda disponible en `http://localhost`.

- Nginx sirve el frontend compilado y redirige `/api/` hacia el contenedor FastAPI backend.
- Los datos se conservan en `./data/fittracker.db`.

