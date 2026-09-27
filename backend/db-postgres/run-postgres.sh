#!/bin/bash

docker compose up -d

./.venv/bin/python -m uvicorn main:app --reload --port 8002