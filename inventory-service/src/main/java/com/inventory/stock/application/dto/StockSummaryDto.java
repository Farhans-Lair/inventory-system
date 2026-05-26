package com.inventory.stock.application.dto;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class StockSummaryDto {
    private long totalProducts;
    private long totalLocations;
    private long lowStockCount;
    private long outOfStockCount;
    private long overstockCount;
    private long movementsLast24h;
    private long activeReservations;
    private long expiringSoonCount;
}
