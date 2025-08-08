#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
composer install --no-dev --optimize-autoloader
npm ci
npm run build

# Create database directory and file
mkdir -p database
touch database/database.sqlite

# Run migrations
php artisan migrate --force

# Clear and cache config
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
