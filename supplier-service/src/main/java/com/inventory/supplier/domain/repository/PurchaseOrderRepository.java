package com.inventory.supplier.domain.repository;
import com.inventory.supplier.domain.model.PurchaseOrder;
import com.inventory.supplier.domain.model.PurchaseOrder.PoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder,String> {
    List<PurchaseOrder> findBySupplierId(String supplierId);
    List<PurchaseOrder> findByStatus(PoStatus status);
    boolean existsByPoNumber(String poNumber);
}
