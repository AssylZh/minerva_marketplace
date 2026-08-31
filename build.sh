#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

# Run database migrations
cd ..
FLASK_APP=backend.app flask db upgrade
