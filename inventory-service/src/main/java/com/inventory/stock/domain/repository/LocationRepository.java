package com.inventory.stock.domain.repository;

import com.inventory.stock.domain.model.Location;
import java.util.List;
import java.util.Optional;

public interface LocationRepository {
    Optional<Location> findById(String id);
    List<Location> findAll();
    List<Location> findByZone(String zone);
    Location save(Location location);
    boolean existsByName(String name);
}
