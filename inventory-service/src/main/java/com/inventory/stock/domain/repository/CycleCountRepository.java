package com.inventory.stock.domain.repository;

import com.inventory.stock.domain.model.CycleCount;
import com.inventory.stock.domain.model.CycleCount.CountStatus;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

@NoRepositoryBean
public interface CycleCountRepository extends JpaRepository<CycleCount, String> {
    List<CycleCount> findByStatus(CountStatus status);
    List<CycleCount> findByProductId(String productId);
    List<CycleCount> findByLocationId(String locationId);
}
