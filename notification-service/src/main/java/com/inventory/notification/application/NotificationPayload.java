package com.inventory.notification.application;

import lombok.Data;
import java.util.Map;

@Data
public class NotificationPayload {
    private String type;        // LOW_STOCK | OVERSTOCK | EXPIRING_SOON | MOVEMENT_RECORDED
    private String productId;
    private String productName;
    private String productSku;
    private String locationName;
    private int    currentQuantity;
    private int    threshold;
    private String performedBy;
    private Map<String, Object> extra;
}
