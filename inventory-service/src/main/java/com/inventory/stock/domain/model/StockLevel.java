package com.inventory.stock.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_levels",
       uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "location_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StockLevel {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Column(nullable = false)
    private int quantity = 0;

    private int minQuantity = 0;
    private int maxQuantity = 0;

    private LocalDateTime lastUpdated;

    @PreUpdate @PrePersist
    public void touch() { lastUpdated = LocalDateTime.now(); }

    public boolean isLowStock()   { return minQuantity > 0 && quantity > 0 && quantity <= minQuantity; }
    public boolean isOutOfStock() { return quantity == 0; }
    public boolean isOverstock()  { return maxQuantity > 0 && quantity > maxQuantity; }
}
