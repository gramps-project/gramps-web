FROM ghcr.io/gramps-project/grampsweb:latest

# Patch 1: OIDC callback — merge ID token claims into userinfo.
# Auth0's userinfo endpoint omits custom Action claims; the ID token JWT contains them.
COPY patches/oidc_resources.py /tmp/oidc_resources_patch.py
RUN DEST=$(python3 -c "import gramps_webapi.api.resources.oidc as m; import inspect; print(inspect.getfile(m))") && \
    cp /tmp/oidc_resources_patch.py "$DEST" && \
    cp /tmp/oidc_resources_patch.py /app/src/gramps_webapi/api/resources/oidc.py 2>/dev/null || true

# Patch 2: auth/oidc.py — treat URL-namespaced role claims (https://...) as direct keys,
# not nested dot-path lookups. GrampsWeb's dot-split logic breaks on URLs.
COPY patches/auth_oidc.py /tmp/auth_oidc_patch.py
RUN DEST=$(python3 -c "import gramps_webapi.auth.oidc as m; import inspect; print(inspect.getfile(m))") && \
    cp /tmp/auth_oidc_patch.py "$DEST" && \
    cp /tmp/auth_oidc_patch.py /app/src/gramps_webapi/auth/oidc.py 2>/dev/null || true

COPY dist /app/static
LABEL org.opencontainers.image.source="https://github.com/sophieella/gramps-web"
