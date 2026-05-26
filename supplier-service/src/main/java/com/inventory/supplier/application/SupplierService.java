package com.inventory.supplier.application;
import com.inventory.supplier.application.dto.*;
import com.inventory.supplier.domain.model.*;
import com.inventory.supplier.domain.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class SupplierService {
    private final SupplierRepository     supplierRepo;
    private final PurchaseOrderRepository poRepo;
    private final GrnRepository          grnRepo;
    private final AtomicLong             poSeq = new AtomicLong(1000);

    public List<SupplierDto> getAllSuppliers() {
        return supplierRepo.findAll().stream().map(this::toSupplierDto).collect(Collectors.toList());
    }
    public SupplierDto createSupplier(SupplierDto dto) {
        Supplier s = Supplier.builder().name(dto.getName()).contactPerson(dto.getContactPerson())
            .email(dto.getEmail()).phone(dto.getPhone()).address(dto.getAddress()).active(true).build();
        return toSupplierDto(supplierRepo.save(s));
    }
    public SupplierDto updateSupplier(String id, SupplierDto dto) {
        Supplier s = supplierRepo.findById(id).orElseThrow(() -> new RuntimeException("Supplier not found"));
        s.setName(dto.getName()); s.setContactPerson(dto.getContactPerson());
        s.setEmail(dto.getEmail()); s.setPhone(dto.getPhone()); s.setAddress(dto.getAddress());
        return toSupplierDto(supplierRepo.save(s));
    }
    public void toggleSupplier(String id) {
        Supplier s = supplierRepo.findById(id).orElseThrow();
        s.setActive(!s.isActive()); supplierRepo.save(s);
    }

    @Transactional
    public PurchaseOrderDto createPo(PurchaseOrderDto dto) {
        Supplier sup = supplierRepo.findById(dto.getSupplierId()).orElseThrow();
        String poNum = "PO-" + poSeq.incrementAndGet();
        while (poRepo.existsByPoNumber(poNum)) poNum = "PO-" + poSeq.incrementAndGet();
        PurchaseOrder po = PurchaseOrder.builder()
            .poNumber(poNum).supplier(sup).status(PurchaseOrder.PoStatus.DRAFT)
            .expectedDeliveryDate(dto.getExpectedDeliveryDate()).notes(dto.getNotes())
            .createdBy(dto.getCreatedBy()).build();
        if (dto.getLines() != null) {
            dto.getLines().forEach(l -> po.getLines().add(PurchaseOrderLine.builder()
                .purchaseOrder(po).productId(l.getProductId()).productSku(l.getProductSku())
                .productName(l.getProductName()).orderedQuantity(l.getOrderedQuantity())
                .unitPrice(l.getUnitPrice()).build()));
        }
        return toPoDto(poRepo.save(po));
    }

    public PurchaseOrderDto updatePoStatus(String id, PurchaseOrder.PoStatus status) {
        PurchaseOrder po = poRepo.findById(id).orElseThrow();
        po.setStatus(status);
        if (status == PurchaseOrder.PoStatus.RECEIVED) po.setReceivedAt(LocalDateTime.now());
        return toPoDto(poRepo.save(po));
    }

    public List<PurchaseOrderDto> getAllPos() {
        return poRepo.findAll().stream().map(this::toPoDto).collect(Collectors.toList());
    }
    public List<PurchaseOrderDto> getPosByStatus(PurchaseOrder.PoStatus status) {
        return poRepo.findByStatus(status).stream().map(this::toPoDto).collect(Collectors.toList());
    }

    @Transactional
    public GrnDto receiveGoods(GrnDto dto) {
        PurchaseOrder po = poRepo.findById(dto.getPoId()).orElseThrow();
        GoodsReceiptNote grn = GoodsReceiptNote.builder()
            .purchaseOrder(po).productId(dto.getProductId())
            .receivedQuantity(dto.getReceivedQuantity()).locationId(dto.getLocationId())
            .batchNumber(dto.getBatchNumber()).notes(dto.getNotes())
            .receivedBy(dto.getReceivedBy()).build();
        po.setStatus(PurchaseOrder.PoStatus.PARTIALLY_RECEIVED);
        poRepo.save(po);
        GoodsReceiptNote saved = grnRepo.save(grn);
        return GrnDto.builder().id(saved.getId()).poId(dto.getPoId())
            .productId(saved.getProductId()).receivedQuantity(saved.getReceivedQuantity())
            .locationId(saved.getLocationId()).batchNumber(saved.getBatchNumber())
            .notes(saved.getNotes()).receivedBy(saved.getReceivedBy()).receivedAt(saved.getReceivedAt()).build();
    }

    public List<GrnDto> getGrnsForPo(String poId) {
        return grnRepo.findByPurchaseOrderId(poId).stream().map(g ->
            GrnDto.builder().id(g.getId()).poId(poId).productId(g.getProductId())
                .receivedQuantity(g.getReceivedQuantity()).locationId(g.getLocationId())
                .batchNumber(g.getBatchNumber()).notes(g.getNotes()).receivedBy(g.getReceivedBy())
                .receivedAt(g.getReceivedAt()).build()).collect(Collectors.toList());
    }

    private SupplierDto toSupplierDto(Supplier s) {
        return SupplierDto.builder().id(s.getId()).name(s.getName()).contactPerson(s.getContactPerson())
            .email(s.getEmail()).phone(s.getPhone()).address(s.getAddress())
            .active(s.isActive()).createdAt(s.getCreatedAt()).build();
    }
    private PurchaseOrderDto toPoDto(PurchaseOrder po) {
        List<PoLineDto> lines = po.getLines().stream().map(l -> PoLineDto.builder()
            .id(l.getId()).productId(l.getProductId()).productSku(l.getProductSku())
            .productName(l.getProductName()).orderedQuantity(l.getOrderedQuantity())
            .receivedQuantity(l.getReceivedQuantity()).unitPrice(l.getUnitPrice()).build())
            .collect(Collectors.toList());
        return PurchaseOrderDto.builder().id(po.getId()).poNumber(po.getPoNumber())
            .supplierId(po.getSupplier().getId()).supplierName(po.getSupplier().getName())
            .status(po.getStatus()).expectedDeliveryDate(po.getExpectedDeliveryDate())
            .notes(po.getNotes()).totalAmount(po.getTotalAmount()).createdBy(po.getCreatedBy())
            .createdAt(po.getCreatedAt()).receivedAt(po.getReceivedAt()).lines(lines).build();
    }
}
