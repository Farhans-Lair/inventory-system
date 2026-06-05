FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn install -N -q
COPY shared-lib ./shared-lib
RUN mvn install -pl shared-lib -q -DskipTests
COPY notification-service/pom.xml ./notification-service/pom.xml
RUN mvn dependency:go-offline -pl notification-service -q
COPY notification-service/src ./notification-service/src
RUN mvn package -pl notification-service -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/notification-service/target/notification-service-*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]
