package com.inventory.notification.application;

import com.inventory.notification.domain.model.NotificationLog;
import com.inventory.notification.infrastructure.email.EmailDispatcher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor @Slf4j
public class NotificationService {

    private final EmailDispatcher          emailDispatcher;
    private final NotificationLogRepository logRepository;

    @Value("${notification.alert-recipients:}") private String alertRecipients;

    @Transactional
    public void send(NotificationPayload payload) {
        if (alertRecipients == null || alertRecipients.isBlank()) {
            log.info("[NOTIFICATION-SKIPPED] No recipients configured. type={}", payload.getType());
            return;
        }
        String subject = buildSubject(payload);
        String body    = buildBody(payload);
        boolean ok = false; String err = null;
        try {
            for (String r : alertRecipients.split(",")) emailDispatcher.send(r.trim(), subject, body);
            ok = true;
        } catch (Exception e) { err = e.getMessage(); }
        logRepository.save(NotificationLog.builder()
                .type(payload.getType()).channel("EMAIL").recipient(alertRecipients)
                .subject(subject).body(body).sent(ok).errorMessage(err).build());
    }

    public List<NotificationLog> getRecentLogs() { return logRepository.findTop50ByOrderBySentAtDesc(); }
    public List<NotificationLog> getFailedLogs()  { return logRepository.findFailed(); }

    private String buildSubject(NotificationPayload p) {
        return switch (p.getType()) {
            case "LOW_STOCK"         -> "[Alert] Low stock: "       + p.getProductName();
            case "OVERSTOCK"         -> "[Alert] Overstock: "       + p.getProductName();
            case "EXPIRING_SOON"     -> "[Alert] Expiring soon: "   + p.getProductName();
            case "MOVEMENT_RECORDED" -> "[Info] Movement recorded: " + p.getProductName();
            default                  -> "[Inventory] "              + p.getType();
        };
    }

    private String buildBody(NotificationPayload p) {
        StringBuilder sb = new StringBuilder();
        sb.append("Product  : ").append(p.getProductName()).append(" (").append(p.getProductSku()).append(")\n");
        if (p.getLocationName() != null) sb.append("Location : ").append(p.getLocationName()).append("\n");
        sb.append("Quantity : ").append(p.getCurrentQuantity()).append("\n");
        if (p.getThreshold() > 0) sb.append("Threshold: ").append(p.getThreshold()).append("\n");
        if (p.getPerformedBy() != null) sb.append("By       : ").append(p.getPerformedBy()).append("\n");
        if (p.getExtra() != null) p.getExtra().forEach((k,v) -> sb.append(k).append(": ").append(v).append("\n"));
        return sb.toString();
    }
}
