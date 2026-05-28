package com.inventory.stock.application;

import com.inventory.stock.application.dto.*;
import com.inventory.stock.domain.model.*;
import com.inventory.stock.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockService {

    private final StockLevelRepository       stockLevelRepository;
    private final StockMovementRepository    movementRepository;
    private final ProductRepository          productRepository;
    private final LocationRepository         locationRepository;
    private final StockReservationRepository reservationRepository;
    private final BatchLotRepository         batchLotRepository;

    // ── Dashboard summary ──────────────────────────────────────────────────
    public StockSummaryDto getSummary() {
        return StockSummaryDto.builder()
                .totalProducts(productRepository.findAll().stream().filter(Product::isActive).count())
                .totalLocations(locationRepository.findAll().stream().filter(Location::isActive).count())
                .lowStockCount(stockLevelRepository.countLowStock())
                .outOfStockCount(stockLevelRepository.countOutOfStock())
                .overstockCount(stockLevelRepository.countOverstock())
                .movementsLast24h(movementRepository.countMovementsAfter(LocalDateTime.now().minusHours(24)))
                .activeReservations(reservationRepository.findByStatus(StockReservation.ReservationStatus.ACTIVE).size())
                .expiringSoonCount(batchLotRepository.findExpiringSoon(LocalDate.now().plusDays(30)).size())
                .build();
    }

    // ── Stock level queries ────────────────────────────────────────────────
    public List<StockLevelDto> getAllLevels()                 { return stockLevelRepository.findAll().stream().map(this::toLevelDto).collect(Collectors.toList()); }
    public List<StockLevelDto> getLevelsByProduct(String id) { return stockLevelRepository.findByProductId(id).stream().map(this::toLevelDto).collect(Collectors.toList()); }
    public List<StockLevelDto> getLevelsByLocation(String id){ return stockLevelRepository.findByLocationId(id).stream().map(this::toLevelDto).collect(Collectors.toList()); }
    public List<StockLevelDto> getLowStock()                 { return stockLevelRepository.findLowStockLevels().stream().map(this::toLevelDto).collect(Collectors.toList()); }
    public List<StockLevelDto> getOutOfStock()               { return stockLevelRepository.findOutOfStockLevels().stream().map(this::toLevelDto).collect(Collectors.toList()); }
    public List<StockLevelDto> getOverstock()                { return stockLevelRepository.findOverstockLevels().stream().map(this::toLevelDto).collect(Collectors.toList()); }

    @Transactional
    public StockLevelDto updateThresholds(String productId, String locationId, int minQty, int maxQty) {
        StockLevel sl = getOrCreateLevel(productId, locationId);
        sl.setMinQuantity(minQty);
        sl.setMaxQuantity(maxQty);
        return toLevelDto(stockLevelRepository.save(sl));
    }

    // ── B1+B2+B5: Record movement with overstock alert + reason codes ──────
    @Transactional
    public StockMovementResponse recordMovement(StockMovementRequest req, String performedBy) {
        Product product = productRepository.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        StockMovement.StockMovementBuilder builder = StockMovement.builder()
                .product(product).type(req.getType()).quantity(req.getQuantity())
                .reason(req.getReason()).reasonCode(req.getReasonCode()).performedBy(performedBy);

        StockLevel affectedLevel = null;

        switch (req.getType()) {
            case INBOUND -> {
                Location to = getLocation(req.getToLocationId());
                StockLevel level = getOrCreateLevel(product.getId(), to.getId());
                level.setQuantity(level.getQuantity() + req.getQuantity());
                affectedLevel = stockLevelRepository.save(level);
                builder.toLocation(to);
                // B2: Overstock alert
                if (affectedLevel.isOverstock()) {
                    publishOverstockAlert(product, to, affectedLevel);
                }
            }
            case OUTBOUND -> {
                Location from = getLocation(req.getFromLocationId());
                StockLevel level = getOrCreateLevel(product.getId(), from.getId());
                int reserved  = reservationRepository.sumActiveReservations(product.getId(), from.getId());
                int available = level.getQuantity() - reserved;
                if (available < req.getQuantity())
                    throw new RuntimeException("Insufficient available stock at " + from.getName()
                            + ". Available (excl. reservations): " + available);
                level.setQuantity(level.getQuantity() - req.getQuantity());
                affectedLevel = stockLevelRepository.save(level);
                builder.fromLocation(from);
                // Low-stock alert
                if (affectedLevel.isLowStock() || affectedLevel.isOutOfStock()) {
                    publishLowStockAlert(product, from, affectedLevel);
                }
            }
            case TRANSFER -> {
                Location from = getLocation(req.getFromLocationId());
                Location to   = getLocation(req.getToLocationId());
                StockLevel fromLevel = getOrCreateLevel(product.getId(), from.getId());
                if (fromLevel.getQuantity() < req.getQuantity())
                    throw new RuntimeException("Insufficient stock at " + from.getName());
                fromLevel.setQuantity(fromLevel.getQuantity() - req.getQuantity());
                stockLevelRepository.save(fromLevel);
                StockLevel toLevel = getOrCreateLevel(product.getId(), to.getId());
                toLevel.setQuantity(toLevel.getQuantity() + req.getQuantity());
                affectedLevel = stockLevelRepository.save(toLevel);
                builder.fromLocation(from).toLocation(to);
                if (affectedLevel.isOverstock()) publishOverstockAlert(product, to, affectedLevel);
            }
        }

        return toMovementDto(movementRepository.save(builder.build()));
    }

    // ── B1: Stock reservations ─────────────────────────────────────────────
    @Transactional
    public StockReservationDto createReservation(StockReservationDto dto) {
        Product  product  = productRepository.findById(dto.getProductId()).orElseThrow(() -> new RuntimeException("Product not found"));
        Location location = locationRepository.findById(dto.getLocationId()).orElseThrow(() -> new RuntimeException("Location not found"));
        StockLevel level  = getOrCreateLevel(product.getId(), location.getId());
        int reserved = reservationRepository.sumActiveReservations(product.getId(), location.getId());
        if (level.getQuantity() - reserved < dto.getQuantity())
            throw new RuntimeException("Insufficient available stock for reservation");
        StockReservation res = StockReservation.builder()
                .product(product).location(location).quantity(dto.getQuantity())
                .referenceId(dto.getReferenceId()).notes(dto.getNotes())
                .reservedBy(dto.getReservedBy())
                .status(StockReservation.ReservationStatus.ACTIVE)
                .expiresAt(dto.getExpiresAt()).build();
        return toReservationDto(reservationRepository.save(res));
    }

    @Transactional
    public StockReservationDto releaseReservation(String id) {
        StockReservation res = reservationRepository.findById(id).orElseThrow(() -> new RuntimeException("Reservation not found"));
        res.setStatus(StockReservation.ReservationStatus.RELEASED);
        return toReservationDto(reservationRepository.save(res));
    }

    @Transactional
    public StockReservationDto fulfillReservation(String id) {
        StockReservation res = reservationRepository.findById(id).orElseThrow(() -> new RuntimeException("Reservation not found"));
        res.setStatus(StockReservation.ReservationStatus.FULFILLED);
        return toReservationDto(reservationRepository.save(res));
    }

    public List<StockReservationDto> getActiveReservations() {
        return reservationRepository.findByStatus(StockReservation.ReservationStatus.ACTIVE)
                .stream().map(this::toReservationDto).collect(Collectors.toList());
    }

    public List<StockReservationDto> getReservationsByProduct(String productId) {
        return reservationRepository.findByProductIdAndStatus(productId, StockReservation.ReservationStatus.ACTIVE)
                .stream().map(this::toReservationDto).collect(Collectors.toList());
    }

    // ── B6: Enhanced demand forecasting ────────────────────────────────────
    public Map<String, Object> getDemandForecast(String productId) {
        List<StockMovement> outbound = movementRepository
                .findByProductIdOrderByTimestampDesc(productId).stream()
                .filter(m -> m.getType() == MovementType.OUTBOUND)
                .limit(90)
                .collect(Collectors.toList());

        if (outbound.isEmpty()) return Map.of(
                "productId", productId, "avgDailyDemand", 0,
                "forecastDays", 30, "forecastedDemand", 0,
                "currentStock", 0, "daysOfStockLeft", 9999,
                "reorderSuggested", false, "confidence", "LOW");

        double totalQty = outbound.stream().mapToInt(StockMovement::getQuantity).sum();
        LocalDateTime oldest = outbound.get(outbound.size() - 1).getTimestamp();
        long days = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(oldest.toLocalDate(), LocalDate.now()) + 1);
        double avgDaily = totalQty / days;

        // Weekly breakdown for trend analysis
        Map<String, Integer> weeklyBreakdown = new LinkedHashMap<>();
        outbound.forEach(m -> {
            String week = "W" + m.getTimestamp().toLocalDate().get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR);
            weeklyBreakdown.merge(week, m.getQuantity(), Integer::sum);
        });

        int currentStock = stockLevelRepository.findByProductId(productId)
                .stream().mapToInt(StockLevel::getQuantity).sum();
        int reservedQty = reservationRepository.findByProductIdAndStatus(productId, StockReservation.ReservationStatus.ACTIVE)
                .stream().mapToInt(StockReservation::getQuantity).sum();
        int availableStock = currentStock - reservedQty;
        int daysLeft = avgDaily > 0 ? (int)(availableStock / avgDaily) : 9999;
        int forecast30 = (int) Math.ceil(avgDaily * 30);

        // Confidence based on data volume
        String confidence = outbound.size() >= 30 ? "HIGH" : outbound.size() >= 10 ? "MEDIUM" : "LOW";

        return Map.of(
                "productId",         productId,
                "avgDailyDemand",    Math.round(avgDaily * 100.0) / 100.0,
                "forecastDays",      30,
                "forecastedDemand",  forecast30,
                "currentStock",      currentStock,
                "reservedStock",     reservedQty,
                "availableStock",    availableStock,
                "daysOfStockLeft",   daysLeft,
                "reorderSuggested",  daysLeft < 14,
                "confidence",        confidence
        );
    }

    public List<StockMovementResponse> getMovementsByProduct(String productId) {
        return movementRepository.findByProductIdOrderByTimestampDesc(productId)
                .stream().map(this::toMovementDto).collect(Collectors.toList());
    }

    public List<StockMovementResponse> getRecentMovements() {
        return movementRepository.findRecentMovements(20)
                .stream().map(this::toMovementDto).collect(Collectors.toList());
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private StockLevel getOrCreateLevel(String productId, String locationId) {
        return stockLevelRepository.findByProductIdAndLocationId(productId, locationId)
                .orElseGet(() -> {
                    Product p  = productRepository.findById(productId).orElseThrow();
                    Location l = locationRepository.findById(locationId).orElseThrow();
                    return StockLevel.builder().product(p).location(l).quantity(0).build();
                });
    }

    private Location getLocation(String id) {
        if (id == null) throw new RuntimeException("Location ID required");
        return locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Location not found: " + id));
    }

    /** B2: Fire overstock alert to notification-service (fire-and-forget). */
    private void publishOverstockAlert(Product p, Location l, StockLevel sl) {
        try {
            RestTemplate rt = new RestTemplate();
            Map<String,Object> payload = new HashMap<>();
            payload.put("type",            "OVERSTOCK");
            payload.put("productId",       p.getId());
            payload.put("productName",     p.getName());
            payload.put("productSku",      p.getSku());
            payload.put("locationName",    l.getName());
            payload.put("currentQuantity", sl.getQuantity());
            payload.put("threshold",       sl.getMaxQuantity());
            rt.postForEntity("http://notification-service:8083/api/notifications/send", payload, Void.class);
        } catch (Exception e) { log.warn("Overstock alert publish failed: {}", e.getMessage()); }
    }

    /** Fire low-stock alert to notification-service (fire-and-forget). */
    private void publishLowStockAlert(Product p, Location l, StockLevel sl) {
        try {
            RestTemplate rt = new RestTemplate();
            Map<String,Object> payload = new HashMap<>();
            payload.put("type",            sl.isOutOfStock() ? "OUT_OF_STOCK" : "LOW_STOCK");
            payload.put("productId",       p.getId());
            payload.put("productName",     p.getName());
            payload.put("productSku",      p.getSku());
            payload.put("locationName",    l.getName());
            payload.put("currentQuantity", sl.getQuantity());
            payload.put("threshold",       sl.getMinQuantity());
            rt.postForEntity("http://notification-service:8083/api/notifications/send", payload, Void.class);
        } catch (Exception e) { log.warn("Low-stock alert publish failed: {}", e.getMessage()); }
    }

    private StockLevelDto toLevelDto(StockLevel sl) {
        int reserved = reservationRepository.sumActiveReservations(sl.getProduct().getId(), sl.getLocation().getId());
        return StockLevelDto.builder()
                .id(sl.getId())
                .productId(sl.getProduct().getId()).productName(sl.getProduct().getName())
                .productSku(sl.getProduct().getSku())
                .locationId(sl.getLocation().getId()).locationName(sl.getLocation().getName())
                .zone(sl.getLocation().getZone())
                .quantity(sl.getQuantity()).minQuantity(sl.getMinQuantity()).maxQuantity(sl.getMaxQuantity())
                .reservedQuantity(reserved).availableQuantity(sl.getQuantity() - reserved)
                .lowStock(sl.isLowStock()).outOfStock(sl.isOutOfStock()).overstock(sl.isOverstock())
                .lastUpdated(sl.getLastUpdated()).build();
    }

    private StockMovementResponse toMovementDto(StockMovement m) {
        return StockMovementResponse.builder()
                .id(m.getId())
                .productId(m.getProduct().getId()).productName(m.getProduct().getName())
                .productSku(m.getProduct().getSku())
                .type(m.getType()).quantity(m.getQuantity())
                .fromLocation(m.getFromLocation() != null ? m.getFromLocation().getName() : null)
                .toLocation(m.getToLocation()   != null ? m.getToLocation().getName()   : null)
                .reason(m.getReason()).reasonCode(m.getReasonCode()).performedBy(m.getPerformedBy())
                .timestamp(m.getTimestamp()).build();
    }

    private StockReservationDto toReservationDto(StockReservation r) {
        return StockReservationDto.builder()
                .id(r.getId())
                .productId(r.getProduct().getId()).productName(r.getProduct().getName())
                .locationId(r.getLocation().getId()).locationName(r.getLocation().getName())
                .quantity(r.getQuantity()).referenceId(r.getReferenceId())
                .notes(r.getNotes()).reservedBy(r.getReservedBy())
                .status(r.getStatus()).createdAt(r.getCreatedAt()).expiresAt(r.getExpiresAt()).build();
    }
}
