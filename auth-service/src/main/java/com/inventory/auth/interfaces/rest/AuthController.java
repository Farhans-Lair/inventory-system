package com.inventory.auth.interfaces.rest;

import com.inventory.auth.application.AuthService;
import com.inventory.auth.application.dto.*;
import com.inventory.auth.infrastructure.security.JwtTokenProvider;
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

    private final AuthService       authService;
    private final JwtTokenProvider  jwtTokenProvider;

    @Value("${cookie.secure:false}")
    private boolean cookieSecure;

    // ── Public: Signup ────────────────────────────────────────────────────
    @PostMapping("/signup")
    public ResponseEntity<OtpRequestResponse> signup(@RequestBody @Valid SignupRequest req) {
        return ResponseEntity.ok(authService.initiateSignup(req));
    }

    @PostMapping("/verify-signup")
    public ResponseEntity<TokenPairResponse> verifySignup(
            @RequestBody @Valid OtpVerifyRequest req, HttpServletResponse res) {
        TokenPairResponse pair = authService.verifySignup(req);
        setAuthCookies(res, pair);
        // Return user info only — tokens are in HttpOnly cookies, not the body
        return ResponseEntity.ok(sanitize(pair));
    }

    // ── Public: Login ─────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<OtpRequestResponse> login(@RequestBody @Valid LoginRequest req) {
        return ResponseEntity.ok(authService.initiateLogin(req));
    }

    @PostMapping("/verify-login")
    public ResponseEntity<TokenPairResponse> verifyLogin(
            @RequestBody @Valid OtpVerifyRequest req, HttpServletResponse res) {
        TokenPairResponse pair = authService.verifyLogin(req);
        setAuthCookies(res, pair);
        return ResponseEntity.ok(sanitize(pair));
    }

    // ── Public: Password reset ────────────────────────────────────────────
    @PostMapping("/forgot-password")
    public ResponseEntity<OtpRequestResponse> forgotPassword(@RequestBody @Valid ForgotPasswordRequest req) {
        return ResponseEntity.ok(authService.forgotPassword(req));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@RequestBody @Valid ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.ok().build();
    }

    // ── Public: Refresh — reads refresh_token cookie, sets new access_token cookie ──
    @PostMapping("/refresh")
    public ResponseEntity<TokenPairResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse res) {
        if (refreshToken == null || refreshToken.isBlank())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            TokenPairResponse pair = authService.refreshAccessToken(refreshToken);
            setAuthCookies(res, pair);
            return ResponseEntity.ok(sanitize(pair));
        } catch (Exception e) {
            clearAuthCookies(res);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    // ── Public: Logout — clears cookies, revokes tokens ──────────────────
    // Logout is permitAll so it works even when the access token has just expired
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "access_token", required = false) String accessToken,
            HttpServletResponse res) {
        if (accessToken != null && jwtTokenProvider.isValid(accessToken)) {
            Claims claims = jwtTokenProvider.validateAndParse(accessToken);
            authService.logout(claims.getSubject());
        }
        clearAuthCookies(res);
        return ResponseEntity.ok().build();
    }

    // ── Cookie helpers ────────────────────────────────────────────────────

    /**
     * Set two HttpOnly cookies:
     *   access_token  — Path=/        (sent to all API endpoints)
     *   refresh_token — Path=/api/auth/ (sent only to auth endpoints)
     */
    private void setAuthCookies(HttpServletResponse res, TokenPairResponse pair) {
        ResponseCookie access = ResponseCookie.from("access_token", pair.getAccessToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/")
                .maxAge(Duration.ofHours(1))
                .build();

        ResponseCookie refresh = ResponseCookie.from("refresh_token", pair.getRefreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/auth/")   // limited to auth endpoints only
                .maxAge(Duration.ofDays(7))
                .build();

        res.addHeader(HttpHeaders.SET_COOKIE, access.toString());
        res.addHeader(HttpHeaders.SET_COOKIE, refresh.toString());
    }

    /** Expire both cookies immediately (browser deletes them). */
    private void clearAuthCookies(HttpServletResponse res) {
        ResponseCookie access = ResponseCookie.from("access_token", "")
                .httpOnly(true).secure(cookieSecure).sameSite("Strict")
                .path("/").maxAge(0).build();

        ResponseCookie refresh = ResponseCookie.from("refresh_token", "")
                .httpOnly(true).secure(cookieSecure).sameSite("Strict")
                .path("/api/auth/").maxAge(0).build();

        res.addHeader(HttpHeaders.SET_COOKIE, access.toString());
        res.addHeader(HttpHeaders.SET_COOKIE, refresh.toString());
    }

    /**
     * Strip the raw token values from the response body.
     * The browser only needs userId/email/fullName/role — tokens are in cookies.
     */
    private TokenPairResponse sanitize(TokenPairResponse pair) {
        return TokenPairResponse.builder()
                .userId(pair.getUserId())
                .email(pair.getEmail())
                .fullName(pair.getFullName())
                .role(pair.getRole())
                // accessToken and refreshToken deliberately omitted
                .build();
    }
}
