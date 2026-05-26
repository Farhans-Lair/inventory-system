package com.inventory.stock.application.dto;

import com.inventory.stock.domain.model.CycleCount.CountStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CycleCountDto {
    private String      id;
    private String      productId;
    private String      productName;
    private String      locationId;
    private String      locationName;
    private int         systemQuantity;
    private int         countedQuantity;
    private int         variance;
    private String      notes;
    private String      countedBy;
    private CountStatus status;
    private LocalDateTime countedAt;
    private LocalDateTime reconciledAt;
}
