package com.inventory.stock.config;

import com.inventory.stock.infrastructure.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // STAKEHOLDER can read everything — same as ADMIN and WAREHOUSE_MANAGER
                .requestMatchers(HttpMethod.GET, "/api/products/**").hasAnyRole("ADMIN","WAREHOUSE_MANAGER","STAKEHOLDER")
                .requestMatchers(HttpMethod.GET, "/api/locations/**").hasAnyRole("ADMIN","WAREHOUSE_MANAGER","STAKEHOLDER")
                .requestMatchers(HttpMethod.GET, "/api/stock/**").hasAnyRole("ADMIN","WAREHOUSE_MANAGER","STAKEHOLDER")
                .requestMatchers(HttpMethod.GET, "/api/batch-lots/**").hasAnyRole("ADMIN","WAREHOUSE_MANAGER","STAKEHOLDER")
                .requestMatchers(HttpMethod.GET, "/api/cycle-counts/**").hasAnyRole("ADMIN","WAREHOUSE_MANAGER","STAKEHOLDER")
                // All write operations require at least WAREHOUSE_MANAGER (fine-grained by @PreAuthorize)
                .anyRequest().hasAnyRole("ADMIN","WAREHOUSE_MANAGER")
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(List.of("*"));
        cfg.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
