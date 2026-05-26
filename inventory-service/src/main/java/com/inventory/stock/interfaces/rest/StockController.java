package com.inventory.stock.interfaces.rest;

import com.inventory.stock.application.StockService;
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

    // ── Reservations ──────────────────────────────────────────────────────
    @PostMapping("/reservations")
    public ResponseEntity<StockReservationDto> reserve(@RequestBody StockReservationDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stockService.createReservation(dto));
    }

    @PatchMapping("/reservations/{id}/release")
    public ResponseEntity<StockReservationDto> release(@PathVariable String id) {
        return ResponseEntity.ok(stockService.releaseReservation(id));
    }

    @GetMapping("/reservations")
    public ResponseEntity<List<StockReservationDto>> reservations() {
        return ResponseEntity.ok(stockService.getActiveReservations());
    }

    // ── Demand forecast ───────────────────────────────────────────────────
    @GetMapping("/forecast/{productId}")
    public ResponseEntity<Map<String, Object>> forecast(@PathVariable String productId) {
        return ResponseEntity.ok(stockService.getDemandForecast(productId));
    }
}
