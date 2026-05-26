package com.inventory.reporting.application.dto;
import lombok.*;
import java.math.BigDecimal;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class StockValuationRow {
    private String productId, sku, name, category;
    private int totalQuantity;
    private BigDecimal costPrice, totalCostValue, sellingPrice, totalSellingValue;
}
