package com.inventory.supplier.domain.repository;
import com.inventory.supplier.domain.model.GoodsReceiptNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface GrnRepository extends JpaRepository<GoodsReceiptNote,String> {
    List<GoodsReceiptNote> findByPurchaseOrderId(String poId);
}
