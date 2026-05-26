package com.inventory.supplier.domain.model;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name="purchase_order_lines") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PurchaseOrderLine {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private String id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="po_id",nullable=false) private PurchaseOrder purchaseOrder;
    @Column(nullable=false) private String productId;
    @Column(nullable=false) private String productSku;
    @Column(nullable=false) private String productName;
    @Column(nullable=false) private int orderedQuantity;
    private int receivedQuantity;
    @Column(precision=12,scale=2) private BigDecimal unitPrice;
}
