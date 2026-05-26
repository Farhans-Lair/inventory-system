package com.inventory.supplier.application.dto;
import lombok.*;
import java.time.LocalDateTime;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SupplierDto {
    private String id, name, contactPerson, email, phone, address;
    private boolean active;
    private LocalDateTime createdAt;
}
