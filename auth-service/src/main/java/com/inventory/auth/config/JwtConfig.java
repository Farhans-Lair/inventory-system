package com.inventory.auth.config;

import com.inventory.shared.security.JwtTokenType;
import com.inventory.shared.security.JwtUtil;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers three shared-lib JwtUtil beans — one per token type, each with
 * its own secret and its own expiry. auth-service is the only service that
 * issues session/refresh tokens, so it's the only one that needs all three;
 * every other service only validates access tokens (see their own
 * JwtConfig, which registers a single ACCESS-typed bean).
 *
 * @Qualifier on each bean disambiguates injection — callers ask for
 * "sessionJwtUtil", "accessJwtUtil", or "refreshJwtUtil" explicitly rather
 * than relying on Spring picking one JwtUtil bean arbitrarily.
 */
@Configuration
public class JwtConfig {

    @Bean
    @Qualifier("sessionJwtUtil")
    public JwtUtil sessionJwtUtil(
            @Value("${jwt.session-secret}") String secret,
            // 10 minutes — matches the OTP's own expiry window (see AuthService.sendOtp).
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
            // 7 days — matches the refresh_token cookie's own maxAge (see AuthController).
            @Value("${jwt.refresh-expiration-ms:604800000}") long expirationMs) {
        return new JwtUtil(secret, expirationMs, JwtTokenType.REFRESH);
    }
}
