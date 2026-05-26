package com.inventory.supplier.interfaces.rest;
import com.inventory.supplier.application.SupplierService;
import com.inventory.supplier.application.dto.*;
import com.inventory.supplier.domain.model.PurchaseOrder.PoStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequiredArgsConstructor
public class SupplierController {
    private final SupplierService supplierService;

    @GetMapping("/api/suppliers")
    public ResponseEntity<List<SupplierDto>> all() { return ResponseEntity.ok(supplierService.getAllSuppliers()); }
    @PostMapping("/api/suppliers")
    public ResponseEntity<SupplierDto> create(@RequestBody SupplierDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.createSupplier(dto)); }
    @PutMapping("/api/suppliers/{id}")
    public ResponseEntity<SupplierDto> update(@PathVariable String id, @RequestBody SupplierDto dto) {
        return ResponseEntity.ok(supplierService.updateSupplier(id, dto)); }
    @PatchMapping("/api/suppliers/{id}/toggle")
    public ResponseEntity<Void> toggle(@PathVariable String id) { supplierService.toggleSupplier(id); return ResponseEntity.ok().build(); }

    @GetMapping("/api/purchase-orders")
    public ResponseEntity<List<PurchaseOrderDto>> allPos(@RequestParam(required=false) PoStatus status) {
        return ResponseEntity.ok(status != null ? supplierService.getPosByStatus(status) : supplierService.getAllPos()); }
    @PostMapping("/api/purchase-orders")
    public ResponseEntity<PurchaseOrderDto> createPo(@RequestBody PurchaseOrderDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.createPo(dto)); }
    @PatchMapping("/api/purchase-orders/{id}/status")
    public ResponseEntity<PurchaseOrderDto> updateStatus(@PathVariable String id, @RequestBody java.util.Map<String,String> body) {
        return ResponseEntity.ok(supplierService.updatePoStatus(id, PoStatus.valueOf(body.get("status")))); }

    @GetMapping("/api/purchase-orders/{poId}/grn")
    public ResponseEntity<List<GrnDto>> getGrns(@PathVariable String poId) {
        return ResponseEntity.ok(supplierService.getGrnsForPo(poId)); }
    @PostMapping("/api/purchase-orders/{poId}/grn")
    public ResponseEntity<GrnDto> receiveGoods(@PathVariable String poId, @RequestBody GrnDto dto) {
        dto.setPoId(poId);
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.receiveGoods(dto)); }
}
