package com.inventory.stock.application;

import com.inventory.stock.application.dto.CycleCountDto;
import com.inventory.stock.domain.model.*;
import com.inventory.stock.domain.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CycleCountService {

    private final CycleCountRepository  cycleCountRepository;
    private final ProductRepository     productRepository;
    private final LocationRepository    locationRepository;
    private final StockLevelRepository  stockLevelRepository;

    /** Start a new count — captures current system qty */
    public CycleCountDto initiate(String productId, String locationId, String countedBy) {
        Product p  = productRepository.findById(productId).orElseThrow();
        Location l = locationRepository.findById(locationId).orElseThrow();
        int sysQty = stockLevelRepository.findByProductIdAndLocationId(productId, locationId)
                .map(StockLevel::getQuantity).orElse(0);
        CycleCount cc = CycleCount.builder()
                .product(p).location(l).systemQuantity(sysQty)
                .countedQuantity(0).variance(0).countedBy(countedBy)
                .status(CycleCount.CountStatus.PENDING).build();
        return toDto(cycleCountRepository.save(cc));
    }

    /** Submit the physical count result */
    @Transactional
    public CycleCountDto submitCount(String id, int countedQty, String notes) {
        CycleCount cc = cycleCountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cycle count not found"));
        cc.setCountedQuantity(countedQty);
        cc.setVariance(countedQty - cc.getSystemQuantity());
        cc.setNotes(notes);
        cc.setStatus(cc.getVariance() == 0
                ? CycleCount.CountStatus.COUNTED
                : CycleCount.CountStatus.DISCREPANCY);
        return toDto(cycleCountRepository.save(cc));
    }

    /** Reconcile — adjust stock level to match physical count */
    @Transactional
    public CycleCountDto reconcile(String id) {
        CycleCount cc = cycleCountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cycle count not found"));
        StockLevel sl = stockLevelRepository
                .findByProductIdAndLocationId(cc.getProduct().getId(), cc.getLocation().getId())
                .orElseThrow();
        sl.setQuantity(cc.getCountedQuantity());
        stockLevelRepository.save(sl);
        cc.setStatus(CycleCount.CountStatus.RECONCILED);
        cc.setReconciledAt(LocalDateTime.now());
        return toDto(cycleCountRepository.save(cc));
    }

    public List<CycleCountDto> getPending() {
        return cycleCountRepository.findByStatus(CycleCount.CountStatus.PENDING)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<CycleCountDto> getDiscrepancies() {
        return cycleCountRepository.findByStatus(CycleCount.CountStatus.DISCREPANCY)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    private CycleCountDto toDto(CycleCount c) {
        return CycleCountDto.builder()
                .id(c.getId())
                .productId(c.getProduct().getId()).productName(c.getProduct().getName())
                .locationId(c.getLocation().getId()).locationName(c.getLocation().getName())
                .systemQuantity(c.getSystemQuantity()).countedQuantity(c.getCountedQuantity())
                .variance(c.getVariance()).notes(c.getNotes()).countedBy(c.getCountedBy())
                .status(c.getStatus()).countedAt(c.getCountedAt()).reconciledAt(c.getReconciledAt())
                .build();
    }
}
