package com.inventory.stock.domain.repository;

import com.inventory.stock.domain.model.Product;
import java.util.List;
import java.util.Optional;

public interface ProductRepository {
    Optional<Product> findById(String id);
    Optional<Product> findBySku(String sku);
    List<Product> findAll();
    List<Product> findByCategory(String category);
    Product save(Product product);
    boolean existsBySku(String sku);
    void deleteById(String id);
}
