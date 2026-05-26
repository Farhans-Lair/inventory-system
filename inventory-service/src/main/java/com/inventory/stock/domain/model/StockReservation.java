package com.inventory.stock.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_reservations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StockReservation {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private String referenceId;   // order ID or reason

    private String notes;

    @Column(nullable = false)
    private String reservedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReservationStatus status;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime expiresAt;

    public enum ReservationStatus { ACTIVE, RELEASED, FULFILLED, EXPIRED }
}
