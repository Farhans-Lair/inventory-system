package com.inventory.auth.infrastructure.persistence;

import com.inventory.auth.domain.model.OtpToken;
import com.inventory.auth.domain.repository.OtpTokenRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface JpaOtpTokenRepository
        extends JpaRepository<OtpToken, String>, OtpTokenRepository {

    @Query("SELECT o FROM OtpToken o WHERE o.email = :email AND o.purpose = :purpose ORDER BY o.expiresAt DESC LIMIT 1")
    Optional<OtpToken> findLatestByEmailAndPurpose(String email, OtpToken.OtpPurpose purpose);

    void deleteByEmail(String email);
}
