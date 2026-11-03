FROM node:20.19.2-bookworm-slim AS assets

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_APP_NAME=ScanMySocial
ARG VITE_PUSHER_APP_KEY=
ARG VITE_PUSHER_APP_CLUSTER=ap2
ARG VITE_PUSHER_SCHEME=https
ARG VITE_RAZORPAY_KEY_ID=
ARG VITE_NOTIFICATIONS_POLL_SECONDS=20
ARG VITE_REVERB_APP_KEY=
ARG VITE_REVERB_HOST=
ARG VITE_REVERB_PORT=443
ARG VITE_REVERB_SCHEME=https
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_PUSHER_APP_KEY=${VITE_PUSHER_APP_KEY}
ENV VITE_PUSHER_APP_CLUSTER=${VITE_PUSHER_APP_CLUSTER}
ENV VITE_PUSHER_SCHEME=${VITE_PUSHER_SCHEME}
ENV VITE_RAZORPAY_KEY_ID=${VITE_RAZORPAY_KEY_ID}
ENV VITE_NOTIFICATIONS_POLL_SECONDS=${VITE_NOTIFICATIONS_POLL_SECONDS}
ENV VITE_REVERB_APP_KEY=${VITE_REVERB_APP_KEY}
ENV VITE_REVERB_HOST=${VITE_REVERB_HOST}
ENV VITE_REVERB_PORT=${VITE_REVERB_PORT}
ENV VITE_REVERB_SCHEME=${VITE_REVERB_SCHEME}
RUN npm run build

FROM php:8.4.8-fpm-bookworm AS app

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        default-mysql-client \
        git \
        libfreetype6-dev \
        libicu-dev \
        libjpeg62-turbo-dev \
        libonig-dev \
        libpng-dev \
        libxml2-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        exif \
        gd \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

COPY . .
COPY --from=assets /app/public/build ./public/build
COPY docker/php/php.ini /usr/local/etc/php/conf.d/scanmysocial.ini

RUN composer dump-autoload --optimize \
    && mkdir -p \
        bootstrap/cache \
        storage/app/public \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/testing \
        storage/framework/views \
        storage/logs \
    && ln -snf ../storage/app/public public/storage \
    && chmod +x docker/entrypoint.sh docker/scheduler.sh \
    && chown -R www-data:www-data bootstrap/cache storage

# Run container process as www-data (non-root). The Dockerfile mkdir/chown
# above pre-creates all writable paths with correct ownership so the
# entrypoint does not need root to set up the filesystem.
USER www-data

ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["php-fpm"]

FROM nginx:1.27.4-alpine AS web

WORKDIR /var/www/html

RUN apk update && apk upgrade --no-cache

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=app /var/www/html/public ./public

RUN mkdir -p storage/app/public \
    && ln -snf ../storage/app/public public/storage

# Run container process as nginx (non-root). Public files copied from the
# app stage are world-readable, so nginx can serve them without a chown.
USER nginx
