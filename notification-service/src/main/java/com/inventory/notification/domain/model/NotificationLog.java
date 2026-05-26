package com.inventory.notification.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity @Table(name = "notification_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationLog {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false) private String type;
    @Column(nullable = false) private String channel;
    @Column(nullable = false) private String recipient;
    @Column(length = 2000)   private String subject;
    @Column(length = 4000)   private String body;
    private boolean sent;
    private String  errorMessage;
    @CreationTimestamp private LocalDateTime sentAt;
}
