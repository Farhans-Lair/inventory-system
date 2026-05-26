package com.inventory.stock.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "cycle_counts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CycleCount {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    private int systemQuantity;
    private int countedQuantity;
    private int variance;          // counted - system

    private String notes;
    private String countedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CountStatus status;

    @CreationTimestamp
    private LocalDateTime countedAt;

    private LocalDateTime reconciledAt;

    public enum CountStatus { PENDING, COUNTED, RECONCILED, DISCREPANCY }
}
