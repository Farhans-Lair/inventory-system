package com.inventory.stock.config;

import com.inventory.shared.security.CorsDefaults;
import com.inventory.shared.security.Roles;
import com.inventory.stock.infrastructure.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

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

            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/actuator/health",
                    "/actuator/health/readiness",
                    "/actuator/health/liveness",
                    "/actuator/info"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**").hasAnyRole(Roles.ADMIN, Roles.WAREHOUSE_MANAGER, Roles.STAKEHOLDER)
                .requestMatchers(HttpMethod.GET, "/api/locations/**").hasAnyRole(Roles.ADMIN, Roles.WAREHOUSE_MANAGER, Roles.STAKEHOLDER)
                .requestMatchers(HttpMethod.GET, "/api/stock/**").hasAnyRole(Roles.ADMIN, Roles.WAREHOUSE_MANAGER, Roles.STAKEHOLDER)
                .requestMatchers(HttpMethod.GET, "/api/batch-lots/**").hasAnyRole(Roles.ADMIN, Roles.WAREHOUSE_MANAGER, Roles.STAKEHOLDER)
                .requestMatchers(HttpMethod.GET, "/api/cycle-counts/**").hasAnyRole(Roles.ADMIN, Roles.WAREHOUSE_MANAGER, Roles.STAKEHOLDER)
                .anyRequest().hasAnyRole(Roles.ADMIN, Roles.WAREHOUSE_MANAGER)
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        return CorsDefaults.defaultCorsConfigurationSource();
    }
}
