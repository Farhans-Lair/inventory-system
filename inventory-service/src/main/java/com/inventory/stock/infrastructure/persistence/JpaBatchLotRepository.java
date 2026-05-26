package com.inventory.stock.infrastructure.persistence;

import com.inventory.stock.domain.repository.BatchLotRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.inventory.stock.domain.model.BatchLot;

public interface JpaBatchLotRepository
        extends BatchLotRepository, JpaRepository<BatchLot, String> {}
