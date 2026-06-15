FROM ghcr.io/gramps-project/grampsweb:latest

# Patch the OIDC callback to merge ID token claims into userinfo.
# Auth0's userinfo endpoint omits custom Action claims; the ID token contains them.
COPY patches/oidc_resources.py /tmp/oidc_patch.py
RUN DEST=$(python3 -c "import gramps_webapi.api.resources.oidc as m; import inspect; print(inspect.getfile(m))") && \
    cp /tmp/oidc_patch.py "$DEST" && \
    cp /tmp/oidc_patch.py /app/src/gramps_webapi/api/resources/oidc.py 2>/dev/null || true

COPY dist /app/static
LABEL org.opencontainers.image.source="https://github.com/sophieella/gramps-web"
