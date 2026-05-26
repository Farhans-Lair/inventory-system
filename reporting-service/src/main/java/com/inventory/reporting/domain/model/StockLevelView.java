package com.inventory.reporting.domain.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name = "stock_levels") @Getter @Setter @NoArgsConstructor
public class StockLevelView {
    @Id private String id;
    @Column(name="product_id")  private String productId;
    @Column(name="location_id") private String locationId;
    private int quantity, minQuantity, maxQuantity;
    private LocalDateTime lastUpdated;
}
