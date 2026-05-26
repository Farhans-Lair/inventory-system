package com.inventory.stock.application.dto;

import com.inventory.stock.domain.model.MovementType;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class StockMovementResponse {
    private String       id;
    private String       productId;
    private String       productName;
    private String       productSku;
    private MovementType type;
    private int          quantity;
    private String       fromLocation;
    private String       toLocation;
    private String       reason;
    private String       reasonCode;
    private String       performedBy;
    private LocalDateTime timestamp;
}
