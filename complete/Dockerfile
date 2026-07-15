# syntax=docker/dockerfile:1

FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace

COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon

COPY src ./src
RUN ./gradlew clean bootJar --no-daemon \
    && jar_file="$(find build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' -print -quit)" \
    && test -n "$jar_file" \
    && jar tf "$jar_file" | grep --quiet 'BOOT-INF/lib/spring-boot-' \
    && mkdir /workspace/extracted \
    && cd /workspace/extracted \
    && jar -xf "/workspace/$jar_file"

FROM eclipse-temurin:17-jre-jammy AS runtime

RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system spring \
    && useradd --system --gid spring --home-dir /app spring

WORKDIR /app
COPY --from=build --chown=spring:spring /workspace/extracted/BOOT-INF/lib /app/lib
COPY --from=build --chown=spring:spring /workspace/extracted/BOOT-INF/classes /app/classes
RUN mkdir -p /data/uploads/post-images \
    && chown -R spring:spring /data

USER spring
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=6 \
    CMD curl --fail --silent --show-error http://127.0.0.1:8080/actuator/health > /dev/null || exit 1

ENTRYPOINT ["java", "-cp", "/app/classes:/app/lib/*", "com.example.restservice.RestServiceApplication"]
