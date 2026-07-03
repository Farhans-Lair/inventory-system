package com.inventory.supplier.config;

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

/**
 * AWS X-Ray tracing for supplier-service.
 *
 * Deliberately non-blocking: X-Ray operations are wrapped in try-catch so
 * that a missing daemon, SDK exception, or any X-Ray failure NEVER affects
 * the actual request. The filter always calls filterChain.doFilter() and
 * never swallows or rethrows exceptions from the application itself.
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

                Segment segment = null;
                try {
                    segment = AWSXRay.beginSegment("supplier-service");
                    segment.putHttp("request", Map.of(
                            "method", request.getMethod(),
                            "url",    request.getRequestURL().toString()
                    ));
                } catch (Exception ignored) {
                    // X-Ray must never block requests — daemon may not be running locally
                }

                // Always run the actual request regardless of X-Ray state
                filterChain.doFilter(request, response);

                try {
                    if (segment != null) {
                        segment.putHttp("response", Map.of("status", response.getStatus()));
                        AWSXRay.endSegment();
                    }
                } catch (Exception ignored) {
                    // Silently discard — X-Ray send failure is not a request failure
                }
            }
        });
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}
