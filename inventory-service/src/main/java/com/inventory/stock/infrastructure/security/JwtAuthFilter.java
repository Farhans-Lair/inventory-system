package com.inventory.stock.infrastructure.security;

import com.inventory.shared.security.JwtAuthenticationFilter;
import com.inventory.shared.security.JwtUtil;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Component
public class JwtAuthFilter extends JwtAuthenticationFilter {

    public JwtAuthFilter(@Qualifier("accessJwtUtil") JwtUtil jwtUtil) {
        super(jwtUtil);
    }
}
