#!/bin/sh
set -e

# Capture runtime UID/GID from environment variables, defaulting to 1000
PUID=${USER_UID:-1000}
PGID=${USER_GID:-1000}

# Adjust the node user's UID/GID if they differ from the runtime request
# and fix volume ownership only when a remap is needed
changed=0

if [ "$(id -u node)" -ne "$PUID" ]; then
    echo "Updating node UID to $PUID"
    usermod -o -u "$PUID" node
    changed=1
fi

if [ "$(id -g node)" -ne "$PGID" ]; then
    echo "Updating node GID to $PGID"
    groupmod -o -g "$PGID" node
    usermod -g "$PGID" node
    changed=1
fi

if [ "$changed" = "1" ]; then
    chown -R node:node /paperclip
fi

# Support a 'maintain' subcommand for running the database maintenance script
# standalone (e.g., as a Docker init/one-shot service or for manual invocation).
#
# Usage inside the container:
#   docker run --rm <image> maintain
#   docker exec <container> docker-entrypoint.sh maintain
if [ "$1" = "maintain" ]; then
    exec gosu node node \
        --import ./server/node_modules/tsx/dist/loader.mjs \
        packages/db/src/maintain.ts
fi

exec gosu node "$@"
