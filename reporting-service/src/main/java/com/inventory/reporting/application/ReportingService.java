package com.inventory.reporting.application;
import com.inventory.reporting.application.dto.*;
import com.inventory.reporting.domain.model.MovementView;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class ReportingService {
    private final EntityManager em;

    @SuppressWarnings("unchecked")
    public List<StockValuationRow> getStockValuation() {
        List<Object[]> rows = em.createNativeQuery(
            "SELECT p.id, p.sku, p.name, p.category, COALESCE(SUM(sl.quantity),0), p.cost_price, p.selling_price " +
            "FROM products p LEFT JOIN stock_levels sl ON sl.product_id = p.id " +
            "WHERE p.active = 1 GROUP BY p.id, p.sku, p.name, p.category, p.cost_price, p.selling_price")
            .getResultList();
        return rows.stream().map(r -> {
            int qty = ((Number)r[4]).intValue();
            BigDecimal cost = r[5] != null ? (BigDecimal)r[5] : BigDecimal.ZERO;
            BigDecimal sell = r[6] != null ? (BigDecimal)r[6] : BigDecimal.ZERO;
            return StockValuationRow.builder()
                .productId((String)r[0]).sku((String)r[1]).name((String)r[2]).category((String)r[3])
                .totalQuantity(qty).costPrice(cost).sellingPrice(sell)
                .totalCostValue(cost.multiply(BigDecimal.valueOf(qty)))
                .totalSellingValue(sell.multiply(BigDecimal.valueOf(qty))).build();
        }).collect(Collectors.toList());
    }

    public List<MovementSummaryRow> getMovements(LocalDate from, LocalDate to) {
        LocalDateTime dtFrom = from != null ? from.atStartOfDay() : LocalDateTime.now().minusDays(30);
        LocalDateTime dtTo   = to   != null ? to.atTime(23,59,59) : LocalDateTime.now();
        return em.createQuery(
            "SELECT m FROM MovementView m WHERE m.timestamp BETWEEN :f AND :t ORDER BY m.timestamp DESC",
            MovementView.class).setParameter("f", dtFrom).setParameter("t", dtTo)
            .setMaxResults(1000).getResultList().stream().map(m ->
                MovementSummaryRow.builder().timestamp(m.getTimestamp())
                    .productId(m.getProductId()).type(m.getType()).quantity(m.getQuantity())
                    .fromLocationId(m.getFromLocationId()).toLocationId(m.getToLocationId())
                    .reason(m.getReason()).reasonCode(m.getReasonCode()).performedBy(m.getPerformedBy())
                    .build())
            .collect(Collectors.toList());
    }

    @SuppressWarnings("unchecked")
    public List<Map<String,Object>> getMovementTrend(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<Object[]> rows = em.createNativeQuery(
            "SELECT DATE(m.timestamp), m.type, SUM(m.quantity) FROM stock_movements m " +
            "WHERE m.timestamp >= :since GROUP BY DATE(m.timestamp), m.type ORDER BY 1 ASC")
            .setParameter("since", since).getResultList();
        return rows.stream().map(r -> Map.<String,Object>of(
            "day", r[0].toString(), "type", (String)r[1], "total", ((Number)r[2]).intValue()))
            .collect(Collectors.toList());
    }

    public byte[] exportValuationCsv() {
        StringBuilder sb = new StringBuilder("sku,name,category,totalQty,costPrice,totalCost,sellingPrice,totalSelling\n");
        getStockValuation().forEach(r -> sb.append(String.join(",",
            safe(r.getSku()), safe(r.getName()), safe(r.getCategory()),
            String.valueOf(r.getTotalQuantity()),
            r.getCostPrice().toPlainString(), r.getTotalCostValue().toPlainString(),
            r.getSellingPrice().toPlainString(), r.getTotalSellingValue().toPlainString()))
            .append("\n"));
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String safe(String s) { if (s==null) return ""; return s.contains(",") ? "\""+s.replace("\"","\"\"")+"\""  : s; }
}
