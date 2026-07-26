package com.inventory.shared.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Slf4j
public class JwtUtil {

    private static final String TYPE_CLAIM = "typ";

    private final SecretKey key;
    private final long      expirationMs;
    private final JwtTokenType tokenType;

    public JwtUtil(String base64Secret) {
        this(base64Secret, 3_600_000L, JwtTokenType.ACCESS);
    }

    public JwtUtil(String base64Secret, long expirationMs) {
        this(base64Secret, expirationMs, JwtTokenType.ACCESS);
    }

    public JwtUtil(String base64Secret, long expirationMs, JwtTokenType tokenType) {
        this.key          = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
        this.expirationMs = expirationMs;
        this.tokenType    = tokenType;
    }

    public String generateAccessToken(String userId, String email, String role) {
        return generateToken(userId, Map.of("email", email, "role", role));
    }

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
