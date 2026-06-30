package com.inventory.supplier.config;

import com.inventory.shared.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers the shared-lib JwtUtil as a Spring bean. supplier-service only
 * ever validates tokens issued by auth-service — it never generates its own
 * — so jwt.secret must match auth-service's exactly since both sign/verify
 * with the same HS256 key (see JWT_SECRET in Secrets Manager / docker-compose env).
 */
@Configuration
public class JwtConfig {

    @Bean
    public JwtUtil jwtUtil(@Value("${jwt.secret}") String secret) {
        return new JwtUtil(secret);
    }
}
