FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn install -N -q
COPY shared-lib ./shared-lib
RUN mvn install -pl shared-lib -q -DskipTests
COPY reporting-service/pom.xml ./reporting-service/pom.xml
RUN mvn dependency:go-offline -pl reporting-service -q
COPY reporting-service/src ./reporting-service/src
RUN mvn package -pl reporting-service -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/reporting-service/target/reporting-service-*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]
