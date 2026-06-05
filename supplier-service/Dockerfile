FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn install -N -q
COPY shared-lib ./shared-lib
RUN mvn install -pl shared-lib -q -DskipTests
COPY supplier-service/pom.xml ./supplier-service/pom.xml
RUN mvn dependency:go-offline -pl supplier-service -q
COPY supplier-service/src ./supplier-service/src
RUN mvn package -pl supplier-service -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/supplier-service/target/supplier-service-*.jar app.jar
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "app.jar"]
