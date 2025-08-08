FROM php:8.1-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    nodejs \
    npm

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy application files
COPY . .

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Install Node.js dependencies and build
RUN npm ci
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
