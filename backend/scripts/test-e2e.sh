#!/usr/bin/env bash
set -e

echo "🧪 Starting E2E test pipeline..."

# Load test env
export $(grep -v '^#' .env.test | xargs)

echo "🐘 Starting test database..."
docker compose -f docker-compose.test.yml up -d

echo "⏳ Waiting for database to be ready..."
until docker inspect --format='{{.State.Health.Status}}' goalflow_test_db | grep -q healthy; do
  sleep 1
done

echo "✅ Database is ready"

echo "📦 Generating Prisma client..."
npx prisma generate

echo "🧱 Running migrations on test DB..."
npx prisma migrate deploy

echo "🚀 Running Unit tests..."
npm test

echo "🚀 Running E2E tests..."
npm run test:e2e

echo "🧹 Stopping test database..."
docker compose -f docker-compose.test.yml down

echo "🎉 E2E tests completed successfully!"
