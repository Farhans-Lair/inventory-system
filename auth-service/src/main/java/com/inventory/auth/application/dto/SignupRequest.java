package com.inventory.auth.application.dto;

import com.inventory.auth.domain.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignupRequest {
    @NotBlank @Email
    private String email;
    @NotBlank
    private String fullName;
    @NotBlank @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
    @NotNull
    private Role role;
}
