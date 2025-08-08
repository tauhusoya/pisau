#!/usr/bin/env bash
# exit on error
set -o errexit

# Install PHP 8.1 and required extensions
apt-get update
apt-get install -y php8.1 php8.1-cli php8.1-common php8.1-mbstring php8.1-xml php8.1-curl php8.1-sqlite3 php8.1-zip unzip

# Install Composer
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer

# Install Node.js dependencies
npm ci
npm run build

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
