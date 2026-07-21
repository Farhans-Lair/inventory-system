package com.inventory.stock.config;

import com.inventory.shared.security.JwtTokenType;
import com.inventory.shared.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers the shared-lib JwtUtil as a Spring bean. inventory-service only
 * ever validates access tokens issued by auth-service — it never issues
 * session or refresh tokens, so it only ever needs the ACCESS secret
 * (jwt.access-secret must match auth-service's JWT_ACCESS_SECRET exactly,
 * since both sign/verify with the same HS256 key — see Secrets Manager /
 * docker-compose env). It never sees the session or refresh secrets at all.
 */
@Configuration
public class JwtConfig {

    @Bean
    public JwtUtil jwtUtil(@Value("${jwt.access-secret}") String secret) {
        return new JwtUtil(secret, 3_600_000L, JwtTokenType.ACCESS);
    }
}
