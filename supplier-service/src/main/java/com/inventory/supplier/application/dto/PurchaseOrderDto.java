package com.inventory.supplier.application.dto;
import com.inventory.supplier.domain.model.PurchaseOrder.PoStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PurchaseOrderDto {
    private String id, poNumber, supplierId, supplierName, notes, createdBy;
    private PoStatus status;
    private LocalDate expectedDeliveryDate;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt, receivedAt;
    private List<PoLineDto> lines;
}
