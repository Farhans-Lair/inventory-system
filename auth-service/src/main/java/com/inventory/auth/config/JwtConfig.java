package com.inventory.auth.config;

import com.inventory.shared.security.JwtTokenType;
import com.inventory.shared.security.JwtUtil;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JwtConfig {

    @Bean
    @Qualifier("sessionJwtUtil")
    public JwtUtil sessionJwtUtil(
            @Value("${jwt.session-secret}") String secret,

            @Value("${jwt.session-expiration-ms:600000}") long expirationMs) {
        return new JwtUtil(secret, expirationMs, JwtTokenType.SESSION);
    }

    @Bean
    @Qualifier("accessJwtUtil")
    public JwtUtil accessJwtUtil(
            @Value("${jwt.access-secret}") String secret,
            @Value("${jwt.expiration-ms:3600000}") long expirationMs) {
        return new JwtUtil(secret, expirationMs, JwtTokenType.ACCESS);
    }

    @Bean
    @Qualifier("refreshJwtUtil")
    public JwtUtil refreshJwtUtil(
            @Value("${jwt.refresh-secret}") String secret,

            @Value("${jwt.refresh-expiration-ms:604800000}") long expirationMs) {
        return new JwtUtil(secret, expirationMs, JwtTokenType.REFRESH);
    }
}
