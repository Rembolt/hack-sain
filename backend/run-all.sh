#!/bin/bash

echo "Starting Complaints Service..."

cd db-sqlite
./run-sqlite.sh &
cd ..

echo "Starting Billing Service..."

cd db-postgres
./run-postgres.sh &
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

wait