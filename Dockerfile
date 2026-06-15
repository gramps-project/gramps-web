FROM ghcr.io/gramps-project/grampsweb:latest

# Patch the OIDC callback to merge ID token claims into userinfo.
# Auth0's userinfo endpoint omits custom Action claims; the ID token contains them.
COPY patches/oidc_resources.py /tmp/oidc_patch.py
RUN PYVER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')") && \
    cp /tmp/oidc_patch.py /usr/local/lib/python${PYVER}/dist-packages/gramps_webapi/api/resources/oidc.py && \
    cp /tmp/oidc_patch.py /app/src/gramps_webapi/api/resources/oidc.py

COPY dist /app/static
LABEL org.opencontainers.image.source="https://github.com/sophieella/gramps-web"
