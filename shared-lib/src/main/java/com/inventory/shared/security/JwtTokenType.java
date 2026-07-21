package com.inventory.shared.security;

/**
 * The three JWT types issued/validated across the system, each signed with
 * its own secret:
 *
 *  - SESSION: short-lived, issued after an OTP is requested (signup/login/
 *    forgot-password). Proves the caller actually went through the
 *    request-OTP step for this email+purpose before they can call the
 *    verify-OTP or reset-password endpoints. Never used for API auth.
 *  - ACCESS:  short-lived (default 1h), sent as "Authorization: Bearer ..."
 *    on every API call. Validated by every backend service.
 *  - REFRESH: long-lived (default 7d), lives only in the HttpOnly
 *    refresh_token cookie. Rotated on every use (see AuthService).
 */
public enum JwtTokenType {
    SESSION("session"),
    ACCESS("access"),
    REFRESH("refresh");

    private final String value;

    JwtTokenType(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }
}
