package com.inventory.stock.infrastructure.persistence;

import com.inventory.stock.domain.model.Product;
import com.inventory.stock.domain.repository.ProductRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface JpaProductRepository extends JpaRepository<Product, String>, ProductRepository {
    Optional<Product> findBySku(String sku);
    boolean existsBySku(String sku);
    List<Product> findByCategory(String category);

    // Bounds the "list everything" case (e.g. GET /api/products) so it can't
    // grow unbounded with the catalog. findAll() with no args is untouched
    // and still used where the full set is genuinely needed, e.g. CSV export.
    default List<Product> findAll(int limit) {
        return findAll(PageRequest.of(0, limit)).getContent();
    }
}
