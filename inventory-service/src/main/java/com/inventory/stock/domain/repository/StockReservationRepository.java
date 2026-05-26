package com.inventory.stock.domain.repository;

import com.inventory.stock.domain.model.StockReservation;
import com.inventory.stock.domain.model.StockReservation.ReservationStatus;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

@NoRepositoryBean
public interface StockReservationRepository extends JpaRepository<StockReservation, String> {
    List<StockReservation> findByProductIdAndStatus(String productId, ReservationStatus status);
    List<StockReservation> findByStatus(ReservationStatus status);

    @Query("SELECT COALESCE(SUM(r.quantity),0) FROM StockReservation r WHERE r.product.id=:productId AND r.location.id=:locationId AND r.status='ACTIVE'")
    int sumActiveReservations(String productId, String locationId);
}
