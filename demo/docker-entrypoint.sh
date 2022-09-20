#!/bin/sh
set -e

# create random flask secret key
if [ ! -s /app/secret/secret ]
then
    mkdir -p /app/secret
    python3 -c "import secrets;print(secrets.token_urlsafe(32))"  | tr -d "\n" > /app/secret/secret
fi
# use the secret key if none is set (will be overridden by config file if present)
if [ -z "$SECRET_KEY" ]
then
    export SECRET_KEY=$(cat /app/secret/secret)
fi

# Create search index if not exists
if [ -z "$(ls -A /app/indexdir)" ]
then
    python3 -m gramps_webapi --config /app/config/config.cfg search index-full
fi

# create user accounts
if [ ! -s /app/users/users.sqlite ]
then
    python3 -m gramps_webapi  --config /app/config/config.cfg user add owner owner --fullname Owner --role 4
    python3 -m gramps_webapi  --config /app/config/config.cfg user add editor editor --fullname Editor --role 3
    python3 -m gramps_webapi  --config /app/config/config.cfg user add contributor contributor --fullname Contributor --role 2
    python3 -m gramps_webapi  --config /app/config/config.cfg user add member member --fullname Member --role 1
fi

exec "$@"
