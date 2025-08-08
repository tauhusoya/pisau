#!/usr/bin/env bash
set -e

# Install dependencies
composer install --no-dev --optimize-autoloader
npm ci
npm run build

# Create database
mkdir -p database
touch database/database.sqlite

# Run migrations
php artisan migrate --force

# Cache config
php artisan config:cache
php artisan route:cache
php artisan view:cache
