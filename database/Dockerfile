FROM postgres:15

ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=admin
ENV POSTGRES_DB=worksage

# Copy migration files
COPY ./migrations /docker-entrypoint-initdb.d/

EXPOSE 5432




