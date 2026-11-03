#!/usr/bin/env sh
set -e

# Ensure all writable sub-directories exist inside the named volumes
# (app_storage, app_bootstrap_cache). These paths are volume-mounted and
# writable even when the container root filesystem runs as read-only.
# mkdir -p on an existing directory is a safe no-op.
mkdir -p \
    bootstrap/cache \
    storage/app/public \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/testing \
    storage/framework/views \
    storage/logs

# NOTE: The public/storage symlink is created at image build time in the
# Dockerfile. It is NOT recreated here because the container root filesystem
# may be read-only (read_only: true in docker-compose.yml).

exec "$@"
