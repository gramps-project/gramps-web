FROM dmstraub/gramps-webapi:latest-devel

# copy config file
COPY config.cfg /app/config/

# copy static frontend
ADD dist /app/static/

# extract & use Gramps example tree
ENV GRAMPS_RESOURCES /usr/share/
RUN cp -r /usr/share/doc/gramps/example/gramps/example.gramps.gz .
RUN gunzip example.gramps.gz
RUN gramps -C Example -i example.gramps --config=database.backend:sqlite --config=database.path:/app/.gramps/grampsdb
RUN rm -rf appcache

ENV HOME /app

# overwrite default entry point
COPY docker-entrypoint.sh /
ENTRYPOINT ["/docker-entrypoint.sh"]

# the $PORT variable is needed for Google Cloud
CMD gunicorn -w 2 -b 0.0.0.0:$PORT gramps_webapi.wsgi:app --timeout 120 --limit-request-line 8190
