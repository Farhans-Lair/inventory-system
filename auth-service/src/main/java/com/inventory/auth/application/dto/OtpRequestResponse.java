package com.inventory.auth.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class OtpRequestResponse {
    private String message;
    private String email;
    // Only populated in dev mode (when SMTP is not configured).
    // Never populated in production.
    private String devOtp;
}
