#!/bin/bash

source .venv/bin/activate

python -m uvicorn app:app \
    --host 0.0.0.0 \
    --port 8003 \
    --reload