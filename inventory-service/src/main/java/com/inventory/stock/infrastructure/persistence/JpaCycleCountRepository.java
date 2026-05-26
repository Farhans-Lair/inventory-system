package com.inventory.stock.infrastructure.persistence;

import com.inventory.stock.domain.repository.CycleCountRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.inventory.stock.domain.model.CycleCount;

public interface JpaCycleCountRepository
        extends CycleCountRepository, JpaRepository<CycleCount, String> {}
