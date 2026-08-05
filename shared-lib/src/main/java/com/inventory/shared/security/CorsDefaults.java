package com.inventory.shared.security;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * The single CORS policy shared by every service's SecurityConfig. Kept as a
 * plain static factory (not a @Bean) so each service still registers its own
 * CorsConfigurationSource bean, just built from one source of truth.
 */
public final class CorsDefaults {

    private CorsDefaults() {}

    public static CorsConfigurationSource defaultCorsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(List.of("*"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
