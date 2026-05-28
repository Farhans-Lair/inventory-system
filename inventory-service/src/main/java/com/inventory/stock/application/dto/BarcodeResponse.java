package com.inventory.stock.application.dto;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BarcodeResponse {
    private String productId;
    private String sku;
    private String barcodeValue;
    private String type;        // QR or CODE128
    /** Base64-encoded PNG image */
    private String imageBase64;
}
