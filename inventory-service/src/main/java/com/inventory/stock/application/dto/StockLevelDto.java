package com.inventory.stock.application.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class StockLevelDto {
    private String id;
    private String productId;
    private String productName;
    private String productSku;
    private String locationId;
    private String locationName;
    private String zone;
    private int    quantity;
    private int    minQuantity;
    private int    maxQuantity;
    private int    reservedQuantity;
    private int    availableQuantity;
    private boolean lowStock;
    private boolean outOfStock;
    private boolean overstock;
    private LocalDateTime lastUpdated;
}
