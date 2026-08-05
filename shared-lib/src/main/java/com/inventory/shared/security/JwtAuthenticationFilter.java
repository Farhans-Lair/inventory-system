package com.inventory.shared.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Validates the access token (Bearer header or access_token cookie) and
 * populates the security context. Each service registers a thin @Component
 * subclass supplying its access-scoped JwtUtil bean via constructor.
 */
public abstract class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String ACCESS_TOKEN_COOKIE = "access_token";

    private final JwtUtil jwtUtil;

    protected JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {

        String token = extractToken(req);

        if (token != null && jwtUtil.isValid(token)) {
            Claims claims = jwtUtil.validateAndParse(token);
            req.setAttribute("claims", claims);
            String role = claims.get("role", String.class);
            var auth = new UsernamePasswordAuthenticationToken(
                    claims.getSubject(), null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role)));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        chain.doFilter(req, res);
    }

    private String extractToken(HttpServletRequest req) {

        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }

        if (req.getCookies() != null) {
            for (Cookie c : req.getCookies()) {
                if (ACCESS_TOKEN_COOKIE.equals(c.getName())) {
                    return c.getValue();
                }
            }
        }
        return null;
    }
}
