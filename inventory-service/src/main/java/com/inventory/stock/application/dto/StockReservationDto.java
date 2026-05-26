package com.inventory.stock.application.dto;

import com.inventory.stock.domain.model.StockReservation.ReservationStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class StockReservationDto {
    private String            id;
    private String            productId;
    private String            productName;
    private String            locationId;
    private String            locationName;
    private int               quantity;
    private String            referenceId;
    private String            notes;
    private String            reservedBy;
    private ReservationStatus status;
    private LocalDateTime     createdAt;
    private LocalDateTime     expiresAt;
}
