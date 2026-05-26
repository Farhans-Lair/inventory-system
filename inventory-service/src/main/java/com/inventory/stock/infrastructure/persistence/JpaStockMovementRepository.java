package com.inventory.stock.infrastructure.persistence;

import com.inventory.stock.domain.model.StockMovement;
import com.inventory.stock.domain.repository.StockMovementRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface JpaStockMovementRepository
        extends JpaRepository<StockMovement, String>, StockMovementRepository {

    List<StockMovement> findByProductIdOrderByTimestampDesc(String productId);

    long countByTimestampAfter(LocalDateTime since);

    default List<StockMovement> findRecentMovements(int limit) {
        return findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "timestamp"))).getContent();
    }

    default long countMovementsAfter(LocalDateTime since) {
        return countByTimestampAfter(since);
    }
}
