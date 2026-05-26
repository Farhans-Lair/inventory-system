package com.inventory.supplier.domain.model;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity @Table(name="goods_receipt_notes") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GoodsReceiptNote {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private String id;
    @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="po_id",nullable=false) private PurchaseOrder purchaseOrder;
    @Column(nullable=false) private String productId;
    @Column(nullable=false) private int receivedQuantity;
    @Column(nullable=false) private String locationId;
    private String batchNumber, notes, receivedBy;
    @CreationTimestamp private LocalDateTime receivedAt;
}
