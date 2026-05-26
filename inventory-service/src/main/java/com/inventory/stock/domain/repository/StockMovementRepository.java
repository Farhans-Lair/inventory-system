package com.inventory.stock.domain.repository;

import com.inventory.stock.domain.model.StockMovement;
import java.time.LocalDateTime;
import java.util.List;

public interface StockMovementRepository {
    StockMovement save(StockMovement movement);
    List<StockMovement> findByProductIdOrderByTimestampDesc(String productId);
    List<StockMovement> findRecentMovements(int limit);
    long countMovementsAfter(LocalDateTime since);
    List<StockMovement> findAll();
}
