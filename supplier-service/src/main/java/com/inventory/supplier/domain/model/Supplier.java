package com.inventory.supplier.domain.model;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity @Table(name="suppliers") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Supplier {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private String id;
    @Column(nullable=false) private String name;
    private String contactPerson, email, phone, address;
    @Column(nullable=false) private boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
