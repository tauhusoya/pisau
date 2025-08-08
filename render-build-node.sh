#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Node.js dependencies first
npm ci
npm run build

# Install Composer (PHP should already be available on Render)
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer

# Install PHP dependencies
composer install --no-dev --optimize-autoloader

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
