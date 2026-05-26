package com.inventory.stock.infrastructure.persistence;

import com.inventory.stock.domain.model.Location;
import com.inventory.stock.domain.repository.LocationRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface JpaLocationRepository extends JpaRepository<Location, String>, LocationRepository {
    boolean existsByName(String name);
    List<Location> findByZone(String zone);
}
