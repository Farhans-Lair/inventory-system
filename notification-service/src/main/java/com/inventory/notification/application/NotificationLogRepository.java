package com.inventory.notification.application;

import com.inventory.notification.domain.model.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, String> {
    List<NotificationLog> findTop50ByOrderBySentAtDesc();
    @Query("SELECT n FROM NotificationLog n WHERE n.sent = false ORDER BY n.sentAt DESC")
    List<NotificationLog> findFailed();
}
