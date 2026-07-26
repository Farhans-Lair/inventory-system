FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

COPY .m2-stage /root/.m2/repository/com/inventory

COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/target/auth-service-*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java",   "-XX:+UseContainerSupport",   "-XX:MaxRAMPercentage=75.0",   "-XX:+UseG1GC",   "-XX:+ExitOnOutOfMemoryError",   "-jar", "app.jar"]
