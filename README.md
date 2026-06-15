# FitTracker

Aplicación personal estilo Strong App para registrar entrenamientos, progresión, medidas corporales, fotos y récords personales.

## Stack

- Frontend: React 19, Vite, TailwindCSS, React Router, Axios, Recharts
- Backend: Python 3.12, FastAPI, SQLAlchemy, Pydantic, Uvicorn
- Base de datos: SQLite
- Infraestructura: Docker, Docker Compose, Nginx

## Desarrollo local

```bash
cd fittracker
docker compose up -d --build
```

Abrir `http://localhost`.

La API queda disponible en `http://localhost/api` y la documentación interactiva en `http://localhost/api/docs` cuando se accede directamente al backend en desarrollo. En producción, Nginx publica los endpoints bajo `/api`.

## Datos persistentes

SQLite y fotos se guardan en:

```text
fittracker/data/
```

En el primer arranque se crea `fittracker.db` y se precarga la rutina:

- Lunes/Jueves
- Martes/Viernes

## Endpoints principales

- `GET /api/dashboard`
- `GET|POST /api/exercises`
- `GET|POST /api/routines`
- `GET|POST /api/workouts`
- `GET|POST /api/measurements`
- `GET|POST /api/photos`
- `GET /api/records`

## Despliegue Ubuntu 24.04

1. Instalar Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

2. Copiar el proyecto al servidor:

```bash
scp -r fittracker usuario@TU_SERVIDOR:/opt/fittracker
```

3. Levantar la aplicación:

```bash
ssh usuario@TU_SERVIDOR
cd /opt/fittracker
sudo docker compose up -d --build
```

4. Ver logs:

```bash
sudo docker compose logs -f
```

5. Backup de SQLite y fotos:

```bash
sudo tar -czf fittracker-backup-$(date +%F).tar.gz data/
```

## Producción

- La app no tiene login porque está pensada para un solo usuario.
- Para exponerla a internet, usar firewall y un reverse proxy con TLS, por ejemplo Caddy, Traefik o Nginx con Certbot.
- Mantener copias de seguridad periódicas de `data/`.
