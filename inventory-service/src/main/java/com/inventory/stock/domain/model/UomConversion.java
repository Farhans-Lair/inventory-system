package com.inventory.stock.domain.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Unit-of-measure conversion rule.
 * e.g. fromUnit=box, toUnit=pcs, factor=24 → 1 box = 24 pcs
 */
@Entity
@Table(name = "uom_conversions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"from_unit","to_unit"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UomConversion {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "from_unit", nullable = false)
    private String fromUnit;

    @Column(name = "to_unit", nullable = false)
    private String toUnit;

    /** Number of toUnit units in one fromUnit. */
    @Column(nullable = false)
    private double factor;

    private String description;   // e.g. "1 box contains 24 pieces"

    /** Convert a quantity from fromUnit to toUnit. */
    public double convert(double quantity) { return quantity * factor; }

    /** Convert a quantity from toUnit back to fromUnit. */
    public double convertReverse(double quantity) { return quantity / factor; }
}
