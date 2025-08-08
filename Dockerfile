FROM php:8.1-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    nodejs \
    npm

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql mbstring exif pcntl bcmath gd zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy composer files first
COPY composer.json composer.lock ./

# Install PHP dependencies with verbose output
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist --verbose

# Copy package files
COPY package.json package-lock.json ./

# Install Node.js dependencies
RUN npm ci

# Copy all application files
COPY . .

# Build React assets
RUN npm run build

# Create database directory
RUN mkdir -p database
RUN touch database/database.sqlite

# Set permissions
RUN chmod -R 755 storage bootstrap/cache

# Expose port
EXPOSE 8000

# Start command
CMD ["php", "artisan", "serve", "--host", "0.0.0.0", "--port", "8000"]
