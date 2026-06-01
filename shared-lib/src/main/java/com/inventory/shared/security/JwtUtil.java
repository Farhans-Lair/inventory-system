package com.inventory.shared.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

/**
 * Stateless JWT utility — no @Component, no Spring dependency.
 * Replaces the duplicated JwtTokenProvider in auth-service and inventory-service.
 *
 * Register as a @Bean in each service's config class:
 *
 *   @Bean
 *   public JwtUtil jwtUtil(@Value("${jwt.secret}") String secret,
 *                          @Value("${jwt.expiration-ms:3600000}") long expiryMs) {
 *       return new JwtUtil(secret, expiryMs);
 *   }
 *
 * Then inject normally: private final JwtUtil jwtUtil;
 */
@Slf4j
public class JwtUtil {

    private final SecretKey key;
    private final long      expirationMs;

    /** Default: 1-hour access token */
    public JwtUtil(String base64Secret) {
        this(base64Secret, 3_600_000L);
    }

    public JwtUtil(String base64Secret, long expirationMs) {
        this.key          = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
        this.expirationMs = expirationMs;
    }

    /** Build a signed access token carrying userId, email and role claims. */
    public String generateAccessToken(String userId, String email, String role) {
        return Jwts.builder()
                .subject(userId)
                .claims(Map.of("email", email, "role", role))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    /** Parse and verify — throws JwtException on any failure. */
    public Claims validateAndParse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** Convenience wrapper — returns false and logs instead of throwing. */
    public boolean isValid(String token) {
        try {
            validateAndParse(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT: {}", e.getMessage());
            return false;
        }
    }
}
