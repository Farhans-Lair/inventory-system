package com.inventory.shared.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.Instant;

/**
 * Uniform HTTP response envelope for all services.
 *
 * Success:  return ResponseEntity.ok(ApiResponse.ok(data));
 * Failure:  return ResponseEntity.badRequest().body(ApiResponse.error("message"));
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private boolean success;
    private T       data;
    private String  error;
    private String  timestamp;

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
                .success(true).data(data)
                .timestamp(Instant.now().toString()).build();
    }

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false).error(message)
                .timestamp(Instant.now().toString()).build();
    }
}
