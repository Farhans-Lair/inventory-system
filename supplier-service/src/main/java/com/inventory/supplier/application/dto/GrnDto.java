package com.inventory.supplier.application.dto;
import lombok.*;
import java.time.LocalDateTime;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GrnDto {
    private String id, poId, productId, locationId, batchNumber, notes, receivedBy;
    private int receivedQuantity;
    private LocalDateTime receivedAt;
}
