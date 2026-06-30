package com.inventory.supplier.application;
import com.inventory.supplier.application.dto.*;
import com.inventory.supplier.domain.model.*;
import com.inventory.supplier.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j
public class SupplierService {
    private final SupplierRepository     supplierRepo;
    private final PurchaseOrderRepository poRepo;
    private final GrnRepository          grnRepo;
    private final AtomicLong             poSeq = new AtomicLong(1000);

    /**
     * Receiving goods against a PO must update real stock — otherwise a GRN
     * is just a paper record that never reflects in the warehouse. There is
     * no service-discovery DNS on ECS, so this goes through the ALB in
     * production and the Docker Compose hostname locally, same pattern as
     * StockService's notification calls in inventory-service.
     */
    @Value("${inventory.service.url:http://inventory-service:8082}")
    private String inventoryServiceUrl;

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
    public GrnDto receiveGoods(GrnDto dto, String authHeader) {
        PurchaseOrder po = poRepo.findById(dto.getPoId()).orElseThrow();
        GoodsReceiptNote grn = GoodsReceiptNote.builder()
            .purchaseOrder(po).productId(dto.getProductId())
            .receivedQuantity(dto.getReceivedQuantity()).locationId(dto.getLocationId())
            .batchNumber(dto.getBatchNumber()).notes(dto.getNotes())
            .receivedBy(dto.getReceivedBy()).build();
        GoodsReceiptNote saved = grnRepo.save(grn);

        // Bump the matching line's receivedQuantity and derive the PO's
        // overall status from line completion, instead of the caller having
        // to separately PATCH the status — a GRN entry IS the source of
        // truth for how much of a PO has actually arrived.
        boolean allLinesFullyReceived = true;
        for (PurchaseOrderLine line : po.getLines()) {
            if (line.getProductId().equals(dto.getProductId())) {
                line.setReceivedQuantity(line.getReceivedQuantity() + dto.getReceivedQuantity());
            }
            if (line.getReceivedQuantity() < line.getOrderedQuantity()) allLinesFullyReceived = false;
        }
        po.setStatus(allLinesFullyReceived ? PurchaseOrder.PoStatus.RECEIVED : PurchaseOrder.PoStatus.PARTIALLY_RECEIVED);
        if (allLinesFullyReceived) po.setReceivedAt(LocalDateTime.now());
        poRepo.save(po);

        pushStockIntoInventory(dto, po, authHeader);

        return GrnDto.builder().id(saved.getId()).poId(dto.getPoId())
            .productId(saved.getProductId()).receivedQuantity(saved.getReceivedQuantity())
            .locationId(saved.getLocationId()).batchNumber(saved.getBatchNumber())
            .notes(saved.getNotes()).receivedBy(saved.getReceivedBy()).receivedAt(saved.getReceivedAt()).build();
    }

    /**
     * Records an INBOUND stock movement in inventory-service for the received
     * quantity. inventory-service requires an authenticated ADMIN/WAREHOUSE_MANAGER
     * caller on POST /api/stock/movement, so we forward the user's own bearer
     * token rather than minting a separate service identity — the user calling
     * receiveGoods() is already required to hold one of those roles by
     * @PreAuthorize on this same endpoint, so the downstream check is redundant
     * but consistent defense-in-depth, not a new restriction.
     *
     * A failure here must not roll back the GRN record itself — the goods
     * physically arrived and that paper trail should stand even if the stock
     * sync needs to be retried or reconciled manually. It is logged loudly so
     * a stuck sync is visible rather than silently dropped.
     */
    private void pushStockIntoInventory(GrnDto dto, PurchaseOrder po, String authHeader) {
        try {
            RestTemplate rt = new RestTemplate();
            Map<String, Object> payload = new HashMap<>();
            payload.put("productId",  dto.getProductId());
            payload.put("type",       "INBOUND");
            payload.put("quantity",   dto.getReceivedQuantity());
            payload.put("toLocationId", dto.getLocationId());
            payload.put("reason",     "Goods receipt for " + po.getPoNumber());
            payload.put("reasonCode", "PURCHASE_RECEIPT");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            if (authHeader != null && !authHeader.isBlank()) headers.set("Authorization", authHeader);

            rt.postForEntity(inventoryServiceUrl + "/api/stock/movement", new HttpEntity<>(payload, headers), Void.class);
            log.info("Pushed INBOUND stock movement for PO {} product {} qty {}",
                    po.getPoNumber(), dto.getProductId(), dto.getReceivedQuantity());
        } catch (Exception e) {
            log.error("Failed to push GRN receipt for PO {} product {} into inventory-service: {}. " +
                    "GRN record was still saved — stock levels may need manual reconciliation.",
                    po.getPoNumber(), dto.getProductId(), e.getMessage());
        }
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
