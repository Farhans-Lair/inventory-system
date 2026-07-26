package com.inventory.stock.application.dto;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BarcodeResponse {
    private String productId;
    private String sku;
    private String barcodeValue;
    private String type;

    private String imageBase64;
}
