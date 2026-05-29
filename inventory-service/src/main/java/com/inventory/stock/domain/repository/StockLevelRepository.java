package com.inventory.stock.domain.repository;

import com.inventory.stock.domain.model.StockLevel;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

@NoRepositoryBean
public interface StockLevelRepository extends JpaRepository<StockLevel, String> {
    List<StockLevel> findByProductId(String productId);
    List<StockLevel> findByLocationId(String locationId);
    Optional<StockLevel> findByProductIdAndLocationId(String productId, String locationId);

    @Query("SELECT COUNT(s) FROM StockLevel s WHERE s.minQuantity > 0 AND s.quantity > 0 AND s.quantity <= s.minQuantity")
    long countLowStock();

    @Query("SELECT COUNT(s) FROM StockLevel s WHERE s.quantity = 0")
    long countOutOfStock();

    @Query("SELECT COUNT(s) FROM StockLevel s WHERE s.maxQuantity > 0 AND s.quantity > s.maxQuantity")
    long countOverstock();

    @Query("SELECT s FROM StockLevel s WHERE s.minQuantity > 0 AND s.quantity > 0 AND s.quantity <= s.minQuantity")
    List<StockLevel> findLowStockLevels();

    @Query("SELECT s FROM StockLevel s WHERE s.quantity = 0")
    List<StockLevel> findOutOfStockLevels();

    @Query("SELECT s FROM StockLevel s WHERE s.maxQuantity > 0 AND s.quantity > s.maxQuantity")
    List<StockLevel> findOverstockLevels();
}
