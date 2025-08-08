#!/usr/bin/env bash
set -e

# Install PHP dependencies
composer install --no-dev --optimize-autoloader --no-interaction

# Install Node.js dependencies and build
npm ci
npm run build

# Create database directory
mkdir -p database
touch database/database.sqlite

# Run migrations
php artisan migrate --force

# Cache config
php artisan config:cache
php artisan route:cache
php artisan view:cache
