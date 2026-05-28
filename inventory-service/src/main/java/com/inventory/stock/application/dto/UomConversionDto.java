package com.inventory.stock.application.dto;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UomConversionDto {
    private String id;
    private String fromUnit;
    private String toUnit;
    private double factor;
    private String description;
    // Convenience: result of a conversion
    private Double convertedQuantity;
}
