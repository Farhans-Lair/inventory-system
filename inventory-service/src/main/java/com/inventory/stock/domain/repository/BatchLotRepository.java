package com.inventory.stock.domain.repository;

import com.inventory.stock.domain.model.BatchLot;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDate;
import java.util.List;

@NoRepositoryBean
public interface BatchLotRepository extends JpaRepository<BatchLot, String> {
    List<BatchLot> findByProductId(String productId);
    List<BatchLot> findByLocationId(String locationId);

    @Query("SELECT b FROM BatchLot b WHERE b.expiryDate IS NOT NULL AND b.expiryDate <= :threshold AND b.quantity > 0")
    List<BatchLot> findExpiringSoon(LocalDate threshold);

    @Query("SELECT b FROM BatchLot b WHERE b.expiryDate IS NOT NULL AND b.expiryDate < :today AND b.quantity > 0")
    List<BatchLot> findExpired(LocalDate today);
}
