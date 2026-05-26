package com.inventory.supplier.domain.repository;
import com.inventory.supplier.domain.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface SupplierRepository extends JpaRepository<Supplier,String> {
    List<Supplier> findByActiveTrue();
}
