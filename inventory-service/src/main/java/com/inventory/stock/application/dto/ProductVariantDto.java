package com.inventory.stock.application.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ProductVariantDto {
    private String      id;
    private String      productId;
    private String      productName;
    private String      sku;
    private String      name;
    private String      attributes;              // raw "color=Red|size=XL"
    private Map<String,String> attributesMap;    // parsed map
    private BigDecimal  costPriceOverride;
    private BigDecimal  sellingPriceOverride;
    private String      imageUrl;
    private boolean     active;
    private LocalDateTime createdAt;
}
