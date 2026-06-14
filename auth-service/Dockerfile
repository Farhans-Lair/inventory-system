# Build context: ./auth-service
# CI stages shared-lib artifacts into ./auth-service/.m2-stage/ before this build
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Populate local Maven cache with shared-lib + parent pom (staged by CI)
COPY .m2-stage /root/.m2/repository/com/inventory

# Download all other dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Compile and package
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/target/auth-service-*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java",   "-XX:+UseContainerSupport",   "-XX:MaxRAMPercentage=75.0",   "-XX:+UseG1GC",   "-XX:+ExitOnOutOfMemoryError",   "-jar", "app.jar"]
