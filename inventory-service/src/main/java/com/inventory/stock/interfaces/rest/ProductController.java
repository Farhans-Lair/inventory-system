package com.inventory.stock.interfaces.rest;

import com.inventory.stock.application.ProductService;
import com.inventory.stock.application.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<List<ProductDto>> getAll() {
        return ResponseEntity.ok(productService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getById(@PathVariable String id) {
        return ResponseEntity.ok(productService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductDto> create(@RequestBody @Valid ProductDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    public ResponseEntity<ProductDto> update(@PathVariable String id, @RequestBody ProductDto dto) {
        return ResponseEntity.ok(productService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable String id) {
        productService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> activate(@PathVariable String id) {
        productService.activate(id);
        return ResponseEntity.ok().build();
    }

    // ── A1: Image upload ──────────────────────────────────────────────────
    @PostMapping("/{id}/image")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    public ResponseEntity<ProductDto> uploadImage(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(productService.uploadImage(id, file));
    }

    // ── A2: Barcode / QR generation ───────────────────────────────────────
    @GetMapping("/{id}/barcode")
    public ResponseEntity<BarcodeResponse> barcode(
            @PathVariable String id,
            @RequestParam(defaultValue = "CODE128") String type) {
        return ResponseEntity.ok(productService.generateBarcode(id, type));
    }

    // ── A3: CSV import / export ───────────────────────────────────────────
    @PostMapping("/import")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ProductDto>> importCsv(@RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(productService.importFromCsv(file));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv() {
        byte[] csv = productService.exportToCsv();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "products.csv");
        return ResponseEntity.ok().headers(headers).body(csv);
    }

    // ── A5: Variants ──────────────────────────────────────────────────────
    @GetMapping("/{id}/variants")
    public ResponseEntity<List<ProductVariantDto>> getVariants(@PathVariable String id) {
        return ResponseEntity.ok(productService.getVariants(id));
    }

    @PostMapping("/{id}/variants")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    public ResponseEntity<ProductVariantDto> createVariant(
            @PathVariable String id,
            @RequestBody ProductVariantDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createVariant(id, dto));
    }

    @PutMapping("/{id}/variants/{variantId}")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    public ResponseEntity<ProductVariantDto> updateVariant(
            @PathVariable String id,
            @PathVariable String variantId,
            @RequestBody ProductVariantDto dto) {
        return ResponseEntity.ok(productService.updateVariant(variantId, dto));
    }

    @PatchMapping("/{id}/variants/{variantId}/toggle")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    public ResponseEntity<Void> toggleVariant(@PathVariable String id, @PathVariable String variantId) {
        productService.toggleVariant(variantId);
        return ResponseEntity.ok().build();
    }
}
