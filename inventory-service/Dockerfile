FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn install -N -q
COPY shared-lib ./shared-lib
RUN mvn install -pl shared-lib -q -DskipTests
COPY inventory-service/pom.xml ./inventory-service/pom.xml
RUN mvn dependency:go-offline -pl inventory-service -q
COPY inventory-service/src ./inventory-service/src
RUN mvn package -pl inventory-service -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/inventory-service/target/inventory-service-*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
