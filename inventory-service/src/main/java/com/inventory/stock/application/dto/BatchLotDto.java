package com.inventory.stock.application.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BatchLotDto {
    private String    id;
    private String    productId;
    private String    productName;
    private String    locationId;
    private String    locationName;
    private String    lotNumber;
    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    private int       quantity;
    private boolean   expired;
    private boolean   expiringSoon;
    private LocalDateTime createdAt;
}
