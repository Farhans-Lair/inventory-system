package com.inventory.auth.domain.repository;

import com.inventory.auth.domain.model.OtpToken;
import java.util.Optional;

public interface OtpTokenRepository {
    OtpToken save(OtpToken token);
    Optional<OtpToken> findLatestByEmailAndPurpose(String email, OtpToken.OtpPurpose purpose);
    void deleteByEmail(String email);
}
