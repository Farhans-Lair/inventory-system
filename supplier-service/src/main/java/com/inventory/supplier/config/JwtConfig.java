package com.inventory.supplier.config;

import com.inventory.shared.security.JwtTokenType;
import com.inventory.shared.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers the shared-lib JwtUtil as a Spring bean. supplier-service only
 * ever validates access tokens issued by auth-service — same rationale as
 * inventory-service's JwtConfig. jwt.access-secret must match auth-service's
 * JWT_ACCESS_SECRET exactly.
 */
@Configuration
public class JwtConfig {

    @Bean
    public JwtUtil jwtUtil(@Value("${jwt.access-secret}") String secret) {
        return new JwtUtil(secret, 3_600_000L, JwtTokenType.ACCESS);
    }
}
