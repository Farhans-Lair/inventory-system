package com.inventory.reporting.interfaces.rest;
import com.inventory.reporting.application.ReportingService;
import com.inventory.reporting.application.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController @RequestMapping("/api/reports") @RequiredArgsConstructor
public class ReportController {
    private final ReportingService reportingService;

    @GetMapping("/valuation")
    public ResponseEntity<List<StockValuationRow>> valuation() {
        return ResponseEntity.ok(reportingService.getStockValuation());
    }

    @GetMapping("/valuation/export")
    public ResponseEntity<byte[]> valuationCsv() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.parseMediaType("text/csv"));
        h.setContentDispositionFormData("attachment","valuation.csv");
        return ResponseEntity.ok().headers(h).body(reportingService.exportValuationCsv());
    }

    @GetMapping("/movements")
    public ResponseEntity<List<MovementSummaryRow>> movements(
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportingService.getMovements(from, to));
    }

    @GetMapping("/trend")
    public ResponseEntity<List<Map<String,Object>>> trend(@RequestParam(defaultValue="30") int days) {
        return ResponseEntity.ok(reportingService.getMovementTrend(days));
    }
}
