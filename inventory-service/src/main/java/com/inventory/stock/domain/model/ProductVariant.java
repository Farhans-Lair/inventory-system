package com.inventory.stock.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Represents a variant of a Product — e.g. "Red / XL" or "500ml".
 * Each variant has its own SKU and optional price override.
 */
@Entity
@Table(name = "product_variants",
       uniqueConstraints = @UniqueConstraint(columnNames = "sku"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductVariant {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, unique = true)
    private String sku;          // e.g. TSHIRT-RED-XL

    @Column(nullable = false)
    private String name;         // e.g. "Red / XL"

    /** Pipe-separated attribute key=value pairs. e.g. "color=Red|size=XL" */
    @Column(length = 512)
    private String attributes;

    @Column(precision = 12, scale = 2)
    private BigDecimal costPriceOverride;

    @Column(precision = 12, scale = 2)
    private BigDecimal sellingPriceOverride;

    private String imageUrl;

    @Column(nullable = false)
    private boolean active = true;

    @CreationTimestamp
    private LocalDateTime createdAt;

    /** Parse attributes string into a readable map representation. */
    public java.util.Map<String,String> getAttributesMap() {
        java.util.Map<String,String> map = new java.util.LinkedHashMap<>();
        if (attributes == null || attributes.isBlank()) return map;
        for (String pair : attributes.split("\\|")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) map.put(kv[0].trim(), kv[1].trim());
        }
        return map;
    }
}
