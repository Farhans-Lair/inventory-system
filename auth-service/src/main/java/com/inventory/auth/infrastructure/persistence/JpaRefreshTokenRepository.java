package com.inventory.auth.infrastructure.persistence;

import com.inventory.auth.domain.repository.RefreshTokenRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.inventory.auth.domain.model.RefreshToken;

public interface JpaRefreshTokenRepository
        extends RefreshTokenRepository, JpaRepository<RefreshToken, String> {}
