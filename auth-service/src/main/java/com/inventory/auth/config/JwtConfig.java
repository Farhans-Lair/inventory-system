package com.inventory.auth.config;

import com.inventory.shared.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers the shared-lib JwtUtil as a Spring bean. JwtUtil itself has no
 * Spring annotations (it's a plain class so non-Spring callers can use it
 * too), so each service that needs it wires it up here from its own
 * jwt.secret / jwt.expiration-ms properties.
 *
 * auth-service is the only service that issues tokens, hence the configurable
 * expiration; services that only validate tokens (inventory-service,
 * supplier-service) use JwtUtil's single-arg constructor, which defaults to
 * a 1-hour expiry that's irrelevant to them since they never call
 * generateAccessToken().
 */
@Configuration
public class JwtConfig {

    @Bean
    public JwtUtil jwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms:3600000}") long expirationMs) {
        return new JwtUtil(secret, expirationMs);
    }
}
