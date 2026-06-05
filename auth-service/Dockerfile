# Build context: project root (docker build -f auth-service/Dockerfile .)
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Install root (parent) pom so shared-lib's parent is resolvable
COPY pom.xml .
RUN mvn install -N -q

# Install shared-lib into local .m2 cache
COPY shared-lib ./shared-lib
RUN mvn install -pl shared-lib -q -DskipTests

# Resolve all auth-service dependencies (cached layer)
COPY auth-service/pom.xml ./auth-service/pom.xml
RUN mvn dependency:go-offline -pl auth-service -q

# Compile and package
COPY auth-service/src ./auth-service/src
RUN mvn package -pl auth-service -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/auth-service/target/auth-service-*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
