package com.inventory.reporting.domain.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name = "stock_movements") @Getter @Setter @NoArgsConstructor
public class MovementView {
    @Id private String id;
    @Column(name="product_id")       private String productId;
    @Column(name="from_location_id") private String fromLocationId;
    @Column(name="to_location_id")   private String toLocationId;
    private String type, reason, reasonCode, performedBy;
    private int quantity;
    private LocalDateTime timestamp;
}
