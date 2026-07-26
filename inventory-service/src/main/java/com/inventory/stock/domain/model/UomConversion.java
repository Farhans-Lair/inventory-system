package com.inventory.stock.domain.model;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(nullable = false)
    private double factor;

    private String description;

    public double convert(double quantity) { return quantity * factor; }

    public double convertReverse(double quantity) { return quantity / factor; }
}
