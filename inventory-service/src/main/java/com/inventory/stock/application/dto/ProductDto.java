package com.inventory.stock.application.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ProductDto {
    private String      id;
    private String      sku;
    private String      name;
    private String      description;
    private String      category;
    private String      unit;
    private String      imageUrl;
    private BigDecimal  costPrice;
    private BigDecimal  sellingPrice;
    private String      barcodeValue;
    private boolean     hasExpiryTracking;
    private boolean     active;
    private LocalDateTime createdAt;
    private int         totalQuantity;
}
