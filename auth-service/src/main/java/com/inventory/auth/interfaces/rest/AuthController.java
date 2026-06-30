package com.inventory.auth.interfaces.rest;

import com.inventory.auth.application.AuthService;
import com.inventory.auth.application.dto.*;
import com.inventory.shared.security.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtUtil     jwtUtil;

    @Value("${cookie.secure:false}")
    private boolean cookieSecure;

    @PostMapping("/signup")
    public ResponseEntity<OtpRequestResponse> signup(@RequestBody @Valid SignupRequest req) {
        return ResponseEntity.ok(authService.initiateSignup(req));
    }

    @PostMapping("/verify-signup")
    public ResponseEntity<TokenPairResponse> verifySignup(
            @RequestBody @Valid OtpVerifyRequest req, HttpServletResponse res) {
        TokenPairResponse pair = authService.verifySignup(req);
        setRefreshCookie(res, pair.getRefreshToken());
        return ResponseEntity.ok(sanitize(pair));
    }

    @PostMapping("/login")
    public ResponseEntity<OtpRequestResponse> login(@RequestBody @Valid LoginRequest req) {
        return ResponseEntity.ok(authService.initiateLogin(req));
    }

    @PostMapping("/verify-login")
    public ResponseEntity<TokenPairResponse> verifyLogin(
            @RequestBody @Valid OtpVerifyRequest req, HttpServletResponse res) {
        TokenPairResponse pair = authService.verifyLogin(req);
        setRefreshCookie(res, pair.getRefreshToken());
        return ResponseEntity.ok(sanitize(pair));
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

    /**
     * Refresh — reads refresh_token HttpOnly cookie (sent automatically because
     * client uses withCredentials:true for this endpoint), rotates it, and
     * returns a new access token in the response body.
     */
    @PostMapping("/refresh")
    public ResponseEntity<TokenPairResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse res) {
        if (refreshToken == null || refreshToken.isBlank())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            TokenPairResponse pair = authService.refreshAccessToken(refreshToken);
            setRefreshCookie(res, pair.getRefreshToken());
            return ResponseEntity.ok(sanitize(pair));
        } catch (Exception e) {
            clearRefreshCookie(res);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Logout — revokes refresh token in DB and clears the refresh_token cookie.
     * Access token expires naturally (max 1 hour) — no server-side revocation needed
     * since it is tab-scoped in sessionStorage and already cleared by the client.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletResponse res) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                if (jwtUtil.isValid(token)) {
                    Claims claims = jwtUtil.validateAndParse(token);
                    authService.logout(claims.getSubject());
                }
            } catch (Exception ignored) {}
        }
        clearRefreshCookie(res);
        return ResponseEntity.ok().build();
    }

    // ── Cookie helpers ────────────────────────────────────────────────────

    private void setRefreshCookie(HttpServletResponse res, String token) {
        ResponseCookie c = ResponseCookie.from("refresh_token", token)
                .httpOnly(true).secure(cookieSecure).sameSite("Strict")
                .path("/api/auth/").maxAge(Duration.ofDays(7)).build();
        res.addHeader(HttpHeaders.SET_COOKIE, c.toString());
    }

    private void clearRefreshCookie(HttpServletResponse res) {
        ResponseCookie c = ResponseCookie.from("refresh_token", "")
                .httpOnly(true).secure(cookieSecure).sameSite("Strict")
                .path("/api/auth/").maxAge(0).build();
        res.addHeader(HttpHeaders.SET_COOKIE, c.toString());
    }

    /**
     * Include accessToken in body (client stores in sessionStorage per tab).
     * Never include refreshToken in body — it lives only in the HttpOnly cookie.
     */
    private TokenPairResponse sanitize(TokenPairResponse pair) {
        return TokenPairResponse.builder()
                .accessToken(pair.getAccessToken())
                .userId(pair.getUserId())
                .email(pair.getEmail())
                .fullName(pair.getFullName())
                .role(pair.getRole())
                .build();
    }
}
