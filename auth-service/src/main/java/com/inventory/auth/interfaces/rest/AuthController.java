package com.inventory.auth.interfaces.rest;

import com.inventory.auth.application.AuthService;
import com.inventory.auth.application.dto.*;
import com.inventory.auth.infrastructure.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService      authService;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/signup")
    public ResponseEntity<OtpRequestResponse> signup(@RequestBody @Valid SignupRequest req) {
        return ResponseEntity.ok(authService.initiateSignup(req));
    }

    @PostMapping("/verify-signup")
    public ResponseEntity<TokenPairResponse> verifySignup(@RequestBody @Valid OtpVerifyRequest req) {
        return ResponseEntity.ok(authService.verifySignup(req));
    }

    @PostMapping("/login")
    public ResponseEntity<OtpRequestResponse> login(@RequestBody @Valid LoginRequest req) {
        return ResponseEntity.ok(authService.initiateLogin(req));
    }

    @PostMapping("/verify-login")
    public ResponseEntity<TokenPairResponse> verifyLogin(@RequestBody @Valid OtpVerifyRequest req) {
        return ResponseEntity.ok(authService.verifyLogin(req));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<OtpRequestResponse> forgotPassword(@RequestBody @Valid ForgotPasswordRequest req) {
        return ResponseEntity.ok(authService.forgotPassword(req));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@RequestBody @Valid ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenPairResponse> refresh(@RequestBody @Valid RefreshTokenRequest req) {
        return ResponseEntity.ok(authService.refreshAccessToken(req));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Claims claims = jwtTokenProvider.validateAndParse(token);
        authService.logout(claims.getSubject());
        return ResponseEntity.ok().build();
    }
}
