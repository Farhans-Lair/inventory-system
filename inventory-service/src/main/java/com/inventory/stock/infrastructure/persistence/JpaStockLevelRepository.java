package com.inventory.stock.infrastructure.persistence;

import com.inventory.stock.domain.model.StockLevel;
import com.inventory.stock.domain.repository.StockLevelRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface JpaStockLevelRepository extends JpaRepository<StockLevel, String>, StockLevelRepository {

    Optional<StockLevel> findByProductIdAndLocationId(String productId, String locationId);

    List<StockLevel> findByProductId(String productId);

    List<StockLevel> findByLocationId(String locationId);

    @Query("SELECT sl FROM StockLevel sl WHERE sl.minQuantity > 0 AND sl.quantity <= sl.minQuantity")
    List<StockLevel> findLowStockLevels();

    @Query("SELECT sl FROM StockLevel sl WHERE sl.quantity = 0")
    List<StockLevel> findOutOfStockLevels();

    @Query("SELECT COUNT(sl) FROM StockLevel sl WHERE sl.minQuantity > 0 AND sl.quantity <= sl.minQuantity")
    long countLowStock();

    @Query("SELECT COUNT(sl) FROM StockLevel sl WHERE sl.quantity = 0")
    long countOutOfStock();
}
