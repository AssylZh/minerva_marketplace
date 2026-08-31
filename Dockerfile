FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt ./backend/
RUN pip install -r backend/requirements.txt

COPY backend/ ./backend/
COPY migrations/ ./migrations/

ENV PYTHONPATH=/app

CMD FLASK_APP=backend.app flask db upgrade && gunicorn backend.app:app --bind 0.0.0.0:${PORT:-5001}
