package com.inventory.stock.config;

import com.inventory.shared.security.JwtTokenType;
import com.inventory.shared.security.JwtUtil;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JwtConfig {

    @Bean
    @Qualifier("accessJwtUtil")
    public JwtUtil jwtUtil(
            @Value("${jwt.access-secret}") String secret,
            @Value("${jwt.expiration-ms:3600000}") long expirationMs) {
        return new JwtUtil(secret, expirationMs, JwtTokenType.ACCESS);
    }
}
