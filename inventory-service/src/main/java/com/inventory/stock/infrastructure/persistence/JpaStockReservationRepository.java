package com.inventory.stock.infrastructure.persistence;

import com.inventory.stock.domain.repository.StockReservationRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.inventory.stock.domain.model.StockReservation;

public interface JpaStockReservationRepository
        extends StockReservationRepository, JpaRepository<StockReservation, String> {}
