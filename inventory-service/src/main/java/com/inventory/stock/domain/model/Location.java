package com.inventory.stock.domain.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "locations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(unique = true, nullable = false)
    private String name;       // e.g. "Zone-A Shelf-01"

    @Column(nullable = false)
    private String zone;       // A, B, C…

    private String description;
    private Integer capacity;  // max units storable

    @Column(nullable = false)
    private boolean active = true;
}
