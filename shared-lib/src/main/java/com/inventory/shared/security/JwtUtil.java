package com.inventory.shared.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Stateless JWT utility — no @Component, no Spring dependency.
 *
 * Each instance is bound to exactly one secret AND one token type ("session",
 * "access", or "refresh" — see JwtTokenType). Every token this instance
 * issues carries a "typ" claim, and validateAndParse() rejects any token
 * whose "typ" doesn't match this instance's type. This is defense-in-depth
 * on top of using separate signing secrets per type: even if two secrets
 * were ever accidentally reused, a session token could not be replayed as
 * an access token or vice versa.
 *
 * Register one @Bean per token type in each service's config class, e.g.:
 *
 *   @Bean
 *   @Qualifier("accessJwtUtil")
 *   public JwtUtil accessJwtUtil(@Value("${jwt.access-secret}") String secret,
 *                                 @Value("${jwt.expiration-ms:3600000}") long expiryMs) {
 *       return new JwtUtil(secret, expiryMs, JwtTokenType.ACCESS);
 *   }
 *
 * Services that only ever validate tokens (inventory-service, supplier-service)
 * just need the ACCESS-typed bean — they never see the session or refresh
 * secrets at all.
 */
@Slf4j
public class JwtUtil {

    private static final String TYPE_CLAIM = "typ";

    private final SecretKey key;
    private final long      expirationMs;
    private final JwtTokenType tokenType;

    /** Default: 1-hour access token. Kept for backward compatibility with
     *  callers that only ever deal with access tokens. */
    public JwtUtil(String base64Secret) {
        this(base64Secret, 3_600_000L, JwtTokenType.ACCESS);
    }

    /** Backward-compatible 2-arg constructor — assumes ACCESS type. */
    public JwtUtil(String base64Secret, long expirationMs) {
        this(base64Secret, expirationMs, JwtTokenType.ACCESS);
    }

    public JwtUtil(String base64Secret, long expirationMs, JwtTokenType tokenType) {
        this.key          = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
        this.expirationMs = expirationMs;
        this.tokenType    = tokenType;
    }

    /** Build a signed access token carrying userId, email and role claims. */
    public String generateAccessToken(String userId, String email, String role) {
        return generateToken(userId, Map.of("email", email, "role", role));
    }

    /**
     * Build a signed token of this instance's type for any subject/claims —
     * used for session tokens (subject = email, claims = {purpose}) and
     * refresh tokens (subject = userId, claims = {jti}).
     */
    public String generateToken(String subject, Map<String, Object> extraClaims) {
        Map<String, Object> claims = new HashMap<>(extraClaims);
        claims.put(TYPE_CLAIM, tokenType.value());
        return Jwts.builder()
                .subject(subject)
                .claims(claims)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    /** Parse and verify — throws JwtException on any failure, including a
     *  "typ" claim that doesn't match this instance's configured type. */
    public Claims validateAndParse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        String typ = claims.get(TYPE_CLAIM, String.class);
        if (typ != null && !typ.equals(tokenType.value())) {
            throw new JwtException(
                    "Token type mismatch: expected '" + tokenType.value() + "' but got '" + typ + "'");
        }
        return claims;
    }

    /** Convenience wrapper — returns false and logs instead of throwing. */
    public boolean isValid(String token) {
        try {
            validateAndParse(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT ({}): {}", tokenType.value(), e.getMessage());
            return false;
        }
    }

    public JwtTokenType tokenType() {
        return tokenType;
    }
}
