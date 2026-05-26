package com.inventory.supplier.domain.model;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name="purchase_orders") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PurchaseOrder {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private String id;
    @Column(nullable=false,unique=true) private String poNumber;
    @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="supplier_id",nullable=false) private Supplier supplier;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private PoStatus status;
    private LocalDate expectedDeliveryDate;
    private String notes;
    @Column(precision=14,scale=2) private BigDecimal totalAmount;
    private String createdBy;
    @CreationTimestamp private LocalDateTime createdAt;
    private LocalDateTime receivedAt;
    @OneToMany(mappedBy="purchaseOrder",cascade=CascadeType.ALL,orphanRemoval=true,fetch=FetchType.EAGER)
    @Builder.Default private List<PurchaseOrderLine> lines = new ArrayList<>();
    public enum PoStatus { DRAFT, SENT, CONFIRMED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED }
}
