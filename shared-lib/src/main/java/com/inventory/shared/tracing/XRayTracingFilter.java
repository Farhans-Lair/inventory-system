package com.inventory.shared.tracing;

import com.amazonaws.xray.AWSXRay;
import com.amazonaws.xray.entities.Segment;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * Wraps each request in an X-Ray segment named after the owning service.
 * Shared across all services; each service supplies its own name (normally
 * its spring.application.name) instead of hardcoding it here.
 */
public class XRayTracingFilter extends OncePerRequestFilter {

    private final String serviceName;

    public XRayTracingFilter(String serviceName) {
        this.serviceName = serviceName;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        Segment segment = null;
        try {
            segment = AWSXRay.beginSegment(serviceName);
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
}
