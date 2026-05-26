package com.inventory.stock.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LocationDto {
    private String id;
    @NotBlank private String name;
    @NotBlank private String zone;
    private String description;
    private Integer capacity;
    private boolean active;
}
