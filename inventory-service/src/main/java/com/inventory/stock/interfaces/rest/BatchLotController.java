package com.inventory.stock.interfaces.rest;

import com.inventory.stock.application.BatchLotService;
import com.inventory.stock.application.dto.BatchLotDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/batch-lots")
@RequiredArgsConstructor
public class BatchLotController {

    private final BatchLotService batchLotService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    public ResponseEntity<BatchLotDto> create(@RequestBody BatchLotDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(batchLotService.create(dto));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<BatchLotDto>> byProduct(@PathVariable String productId) {
        return ResponseEntity.ok(batchLotService.getByProduct(productId));
    }

    @GetMapping("/expiring-soon")
    public ResponseEntity<List<BatchLotDto>> expiringSoon(@RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(batchLotService.getExpiringSoon(days));
    }

    @GetMapping("/expired")
    public ResponseEntity<List<BatchLotDto>> expired() {
        return ResponseEntity.ok(batchLotService.getExpired());
    }
}
