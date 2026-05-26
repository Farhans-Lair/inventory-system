package com.inventory.notification.interfaces.rest;

import com.inventory.notification.application.NotificationPayload;
import com.inventory.notification.application.NotificationService;
import com.inventory.notification.domain.model.NotificationLog;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/notifications") @RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/send")
    public ResponseEntity<Void> send(@RequestBody NotificationPayload payload) {
        notificationService.send(payload);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/logs")
    public ResponseEntity<List<NotificationLog>> logs() {
        return ResponseEntity.ok(notificationService.getRecentLogs());
    }

    @GetMapping("/logs/failed")
    public ResponseEntity<List<NotificationLog>> failed() {
        return ResponseEntity.ok(notificationService.getFailedLogs());
    }
}
