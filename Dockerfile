# Space Truckers v3 — Railway friendly
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# optional local mount path for SQLite fallback (no VOLUME here)
RUN mkdir -p /data

ENV PORT=8080
ENV PYTHONPATH=/app
CMD exec gunicorn --bind 0.0.0.0:${PORT} --workers 2 --threads 4 app.app:app
