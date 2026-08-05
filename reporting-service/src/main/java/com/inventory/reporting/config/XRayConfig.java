package com.inventory.reporting.config;

import com.inventory.shared.tracing.XRayTracingFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class XRayConfig {

    @Bean
    public FilterRegistrationBean<OncePerRequestFilter> xRayFilter(
            @Value("${spring.application.name}") String serviceName) {
        FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new XRayTracingFilter(serviceName));
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}
