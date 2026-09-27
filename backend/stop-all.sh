#!/bin/bash

pkill -f "uvicorn"

cd db-postgres
docker compose down
cd ..