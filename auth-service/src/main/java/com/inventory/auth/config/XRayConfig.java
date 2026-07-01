package com.inventory.auth.config;

import com.amazonaws.xray.javax.servlet.AWSXRayServletFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AWS X-Ray distributed tracing configuration.
 *
 * Registers the X-Ray servlet filter which automatically creates a trace
 * segment for every incoming HTTP request, including the request URL,
 * method, status code, and latency. The segment is visible in the AWS
 * X-Ray console as a node in the service map and as individual traces.
 *
 * On ECS the X-Ray daemon runs as a sidecar container (see ecs.tf). In
 * local dev where no daemon is running, X-Ray silently swallows the data
 * — the LogErrorContextMissingStrategy=true in application.properties logs
 * instead of throwing, so missing-segment errors never break the app.
 */
@Configuration
public class XRayConfig {

    @Bean
    public FilterRegistrationBean<AWSXRayServletFilter> xRayFilter() {
        FilterRegistrationBean<AWSXRayServletFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new AWSXRayServletFilter("auth-service"));
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}
