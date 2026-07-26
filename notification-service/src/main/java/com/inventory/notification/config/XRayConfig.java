package com.inventory.notification.config;

import com.amazonaws.xray.AWSXRay;
import com.amazonaws.xray.entities.Segment;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Configuration
public class XRayConfig {

    @Bean
    public FilterRegistrationBean<OncePerRequestFilter> xRayFilter() {
        FilterRegistrationBean<OncePerRequestFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain filterChain)
                    throws ServletException, IOException {

                Segment segment = null;
                try {
                    segment = AWSXRay.beginSegment("notification-service");
                    segment.putHttp("request", Map.of(
                            "method", request.getMethod(),
                            "url",    request.getRequestURL().toString()
                    ));
                } catch (Exception ignored) {

                }

                filterChain.doFilter(request, response);

                try {
                    if (segment != null) {
                        segment.putHttp("response", Map.of("status", response.getStatus()));
                        AWSXRay.endSegment();
                    }
                } catch (Exception ignored) {

                }
            }
        });
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}
