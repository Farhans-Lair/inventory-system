package com.inventory.supplier.application.dto;
import lombok.*;
import java.math.BigDecimal;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PoLineDto {
    private String id, productId, productSku, productName;
    private int orderedQuantity, receivedQuantity;
    private BigDecimal unitPrice;
}
