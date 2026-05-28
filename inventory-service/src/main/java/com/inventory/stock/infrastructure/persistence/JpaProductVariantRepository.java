package com.inventory.stock.infrastructure.persistence;

import com.inventory.stock.domain.repository.ProductVariantRepository;
import com.inventory.stock.domain.model.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JpaProductVariantRepository
        extends ProductVariantRepository, JpaRepository<ProductVariant, String> {}
