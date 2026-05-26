package com.inventory.reporting.application.dto;
import lombok.*;
import java.time.LocalDateTime;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MovementSummaryRow {
    private LocalDateTime timestamp;
    private String productId, type, fromLocationId, toLocationId, reason, reasonCode, performedBy;
    private int quantity;
}
