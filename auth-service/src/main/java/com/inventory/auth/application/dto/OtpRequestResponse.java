package com.inventory.auth.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class OtpRequestResponse {
    private String message;
    private String email;

    private String devOtp;

    private String sessionToken;
}
