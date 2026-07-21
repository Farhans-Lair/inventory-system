package com.inventory.auth.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_tokens")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RefreshToken {

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    /**
     * Holds the refresh JWT's "jti" claim (a UUID), NOT the bearer token
     * itself. The bearer credential handed to the client is now a signed
     * JWT (see AuthService.buildTokenPair / JwtConfig.refreshJwtUtil) —
     * this row only tracks that jti's revocation state so a stolen/replayed
     * token can be detected and revoked without needing to store the full
     * JWT. Column stays VARCHAR(512) (from the original opaque-token era)
     * which comfortably fits a UUID, so no migration was needed for this.
     */
    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private boolean revoked;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public boolean isExpired() { return LocalDateTime.now().isAfter(expiresAt); }
}
