package com.inventory.stock.domain.repository;

import com.inventory.stock.domain.model.UomConversion;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

@NoRepositoryBean
public interface UomConversionRepository extends JpaRepository<UomConversion, String> {
    Optional<UomConversion> findByFromUnitAndToUnit(String fromUnit, String toUnit);
    List<UomConversion> findByFromUnit(String fromUnit);
}
