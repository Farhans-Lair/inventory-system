package com.inventory.stock.interfaces.rest;

import com.inventory.stock.application.CycleCountService;
import com.inventory.stock.application.dto.CycleCountDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cycle-counts")
@RequiredArgsConstructor
public class CycleCountController {

    private final CycleCountService cycleCountService;

    @PostMapping("/initiate")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    public ResponseEntity<CycleCountDto> initiate(@RequestBody Map<String, String> body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(cycleCountService.initiate(body.get("productId"), body.get("locationId"), body.get("countedBy")));
    }

    @PatchMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    public ResponseEntity<CycleCountDto> submit(@PathVariable String id, @RequestBody Map<String, Object> body) {
        int countedQty = (int) body.get("countedQuantity");
        String notes   = (String) body.getOrDefault("notes", "");
        return ResponseEntity.ok(cycleCountService.submitCount(id, countedQty, notes));
    }

    @PatchMapping("/{id}/reconcile")
    @PreAuthorize("hasAnyRole('ADMIN','WAREHOUSE_MANAGER')")
    public ResponseEntity<CycleCountDto> reconcile(@PathVariable String id) {
        return ResponseEntity.ok(cycleCountService.reconcile(id));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<CycleCountDto>> pending() {
        return ResponseEntity.ok(cycleCountService.getPending());
    }

    @GetMapping("/discrepancies")
    public ResponseEntity<List<CycleCountDto>> discrepancies() {
        return ResponseEntity.ok(cycleCountService.getDiscrepancies());
    }
}
