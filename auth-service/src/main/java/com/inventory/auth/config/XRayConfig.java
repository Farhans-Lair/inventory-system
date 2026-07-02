package com.inventory.auth.config;

import com.amazonaws.xray.AWSXRay;
import com.amazonaws.xray.entities.Segment;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;

import java.io.IOException;

/**
 * AWS X-Ray distributed tracing configuration for auth-service.
 *
 * Uses OncePerRequestFilter (jakarta.servlet) rather than AWSXRayServletFilter
 * (javax.servlet) because Spring Boot 3 migrated fully to jakarta.servlet and
 * the X-Ray SDK 2.x servlet filter is still on the old javax.servlet API —
 * the two are incompatible at compile time.
 *
 * This filter creates an X-Ray segment for every HTTP request, records the
 * URL, method, and response status, and closes the segment on completion.
 * Segments appear in the AWS X-Ray console service map and trace list.
 *
 * In local dev where no X-Ray daemon is running, the SDK silently discards
 * segments — no errors thrown because LogErrorContextMissingStrategy=true
 * is set in application.properties.
 */
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
                String segmentName = "auth";
                Segment segment = null;
                try {
                    segment = AWSXRay.beginSegment(segmentName);
                    segment.putHttp("request", java.util.Map.of(
                            "method", request.getMethod(),
                            "url",    request.getRequestURL().toString()
                    ));
                    filterChain.doFilter(request, response);
                    segment.putHttp("response", java.util.Map.of(
                            "status", response.getStatus()
                    ));
                } catch (Exception e) {
                    if (segment != null) segment.addException(e);
                    throw e;
                } finally {
                    try { AWSXRay.endSegment(); } catch (Exception ignored) {}
                }
            }
        });
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}
