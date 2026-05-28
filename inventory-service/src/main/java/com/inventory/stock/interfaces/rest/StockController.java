package com.inventory.stock.interfaces.rest;

import com.inventory.stock.application.StockService;
import com.inventory.stock.application.UomService;
import com.inventory.stock.application.dto.*;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;
    private final UomService   uomService;

    @GetMapping("/summary")
    public ResponseEntity<StockSummaryDto> summary() {
        return ResponseEntity.ok(stockService.getSummary());
    }

    @GetMapping("/levels")
    public ResponseEntity<List<StockLevelDto>> levels() {
        return ResponseEntity.ok(stockService.getAllLevels());
    }

    @GetMapping("/levels/low-stock")
    public ResponseEntity<List<StockLevelDto>> lowStock() {
        return ResponseEntity.ok(stockService.getLowStock());
    }

    @GetMapping("/levels/out-of-stock")
    public ResponseEntity<List<StockLevelDto>> outOfStock() {
        return ResponseEntity.ok(stockService.getOutOfStock());
    }

    // ── B2: Overstock alerts endpoint ─────────────────────────────────────
    @GetMapping("/levels/overstock")
    public ResponseEntity<List<StockLevelDto>> overstock() {
        return ResponseEntity.ok(stockService.getOverstock());
    }

    @PatchMapping("/levels/thresholds")
    public ResponseEntity<StockLevelDto> updateThresholds(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(stockService.updateThresholds(
                (String) body.get("productId"), (String) body.get("locationId"),
                (int) body.get("minQuantity"), (int) body.get("maxQuantity")));
    }

    // ── B5: Movement with reason codes ────────────────────────────────────
    @PostMapping("/movement")
    public ResponseEntity<StockMovementResponse> movement(
            @RequestBody @Valid StockMovementRequest req, HttpServletRequest http) {
        Claims claims = (Claims) http.getAttribute("claims");
        String user   = claims != null ? claims.get("email", String.class) : "system";
        return ResponseEntity.status(HttpStatus.CREATED).body(stockService.recordMovement(req, user));
    }

    @GetMapping("/movement/recent")
    public ResponseEntity<List<StockMovementResponse>> recent() {
        return ResponseEntity.ok(stockService.getRecentMovements());
    }

    @GetMapping("/movement/product/{productId}")
    public ResponseEntity<List<StockMovementResponse>> byProduct(@PathVariable String productId) {
        return ResponseEntity.ok(stockService.getMovementsByProduct(productId));
    }

    // ── B1: Reservations ─────────────────────────────────────────────────
    @PostMapping("/reservations")
    public ResponseEntity<StockReservationDto> reserve(@RequestBody StockReservationDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stockService.createReservation(dto));
    }

    @PatchMapping("/reservations/{id}/release")
    public ResponseEntity<StockReservationDto> release(@PathVariable String id) {
        return ResponseEntity.ok(stockService.releaseReservation(id));
    }

    @PatchMapping("/reservations/{id}/fulfill")
    public ResponseEntity<StockReservationDto> fulfill(@PathVariable String id) {
        return ResponseEntity.ok(stockService.fulfillReservation(id));
    }

    @GetMapping("/reservations")
    public ResponseEntity<List<StockReservationDto>> reservations() {
        return ResponseEntity.ok(stockService.getActiveReservations());
    }

    @GetMapping("/reservations/product/{productId}")
    public ResponseEntity<List<StockReservationDto>> reservationsByProduct(@PathVariable String productId) {
        return ResponseEntity.ok(stockService.getReservationsByProduct(productId));
    }

    // ── B6: Demand forecast ───────────────────────────────────────────────
    @GetMapping("/forecast/{productId}")
    public ResponseEntity<Map<String, Object>> forecast(@PathVariable String productId) {
        return ResponseEntity.ok(stockService.getDemandForecast(productId));
    }

    // ── B4: UoM conversions ───────────────────────────────────────────────
    @GetMapping("/uom")
    public ResponseEntity<List<UomConversionDto>> allConversions() {
        return ResponseEntity.ok(uomService.getAll());
    }

    @PostMapping("/uom")
    public ResponseEntity<UomConversionDto> createConversion(@RequestBody UomConversionDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(uomService.create(dto));
    }

    @PutMapping("/uom/{id}")
    public ResponseEntity<UomConversionDto> updateConversion(@PathVariable String id, @RequestBody UomConversionDto dto) {
        return ResponseEntity.ok(uomService.update(id, dto));
    }

    @DeleteMapping("/uom/{id}")
    public ResponseEntity<Void> deleteConversion(@PathVariable String id) {
        uomService.delete(id); return ResponseEntity.noContent().build();
    }

    @GetMapping("/uom/convert")
    public ResponseEntity<UomConversionDto> convert(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam double qty) {
        return ResponseEntity.ok(uomService.convert(from, to, qty));
    }
}
