package com.inventory.stock.domain.repository;

import com.inventory.stock.domain.model.ProductVariant;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

@NoRepositoryBean
public interface ProductVariantRepository extends JpaRepository<ProductVariant, String> {
    List<ProductVariant> findByProductId(String productId);
    List<ProductVariant> findByProductIdAndActiveTrue(String productId);
    Optional<ProductVariant> findBySku(String sku);
    boolean existsBySku(String sku);
}
