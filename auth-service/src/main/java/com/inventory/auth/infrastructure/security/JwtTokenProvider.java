package com.inventory.auth.infrastructure.security;

import com.inventory.auth.domain.model.Role;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component @Slf4j
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms:3600000}")
    private long expiration; // 1 h access token

    private SecretKey key;

    @PostConstruct
    public void init() { key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)); }

    /** Kept for backwards-compat; delegates to generateAccessToken */
    public String generateToken(String userId, String email, Role role) {
        return generateAccessToken(userId, email, role);
    }

    public String generateAccessToken(String userId, String email, Role role) {
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("role", role.name())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(key)
                .compact();
    }

    public Claims validateAndParse(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
    }

    public boolean isValid(String token) {
        try { validateAndParse(token); return true; }
        catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT: {}", e.getMessage()); return false;
        }
    }
}
