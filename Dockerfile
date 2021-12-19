FROM dmstraub/gramps_webapi:latest
COPY dist /app/static
LABEL org.opencontainers.image.source="https://github.com/gramps-project/Gramps.js"
