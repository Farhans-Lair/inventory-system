package com.inventory.stock.infrastructure.persistence;

import com.inventory.stock.domain.repository.UomConversionRepository;
import com.inventory.stock.domain.model.UomConversion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaUomConversionRepository
        extends UomConversionRepository, JpaRepository<UomConversion, String> {}
