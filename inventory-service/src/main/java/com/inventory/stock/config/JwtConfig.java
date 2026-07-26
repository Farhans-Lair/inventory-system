package com.inventory.stock.config;

import com.inventory.shared.security.JwtTokenType;
import com.inventory.shared.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JwtConfig {

    @Bean
    public JwtUtil jwtUtil(@Value("${jwt.access-secret}") String secret) {
        return new JwtUtil(secret, 3_600_000L, JwtTokenType.ACCESS);
    }
}
