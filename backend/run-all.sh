#!/bin/bash

echo "Starting Complaints Service..."

cd db-sqlite
./run-sqlite.sh &
cd ..

echo "Starting Billing Service..."

cd db-postgres
./run-postgres.sh &
cd ..

echo "Starting Unified Service..."

cd unified-sqlite
./run-unified.sh &
cd ..

echo ""
echo "Services starting..."
echo ""
echo "Complaints API:"
echo "http://localhost:8001/docs"
echo ""
echo "Billing API:"
echo "http://localhost:8002/docs"
echo ""
echo "Unified API:"
echo "http://localhost:8003/docs"
echo ""

wait