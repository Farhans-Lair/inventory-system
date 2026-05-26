package com.inventory.reporting.domain.model;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity @Table(name = "products") @Getter @Setter @NoArgsConstructor
public class ProductView {
    @Id private String id;
    private String sku, name, category, unit;
    private BigDecimal costPrice, sellingPrice;
    private boolean active;
    private LocalDateTime createdAt;
}
