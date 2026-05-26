package com.inventory.stock.application.dto;

import com.inventory.stock.domain.model.MovementType;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class StockMovementRequest {
    @NotBlank private String productId;
    @NotNull  private MovementType type;
    @Min(1)   private int quantity;
    private String fromLocationId;
    private String toLocationId;
    private String reason;
    private String reasonCode;
}
