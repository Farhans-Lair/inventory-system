package com.inventory.auth.application.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class TokenPairResponse {
    private String accessToken;
    private String refreshToken;
    private String userId;
    private String email;
    private String fullName;
    private String role;
}
