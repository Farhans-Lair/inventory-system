package com.inventory.notification.infrastructure.email;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor @Slf4j
public class EmailDispatcher {

    private final JavaMailSender mailSender;
    @Value("${spring.mail.username:}") private String from;

    public void send(String to, String subject, String body) {
        if (from == null || from.isBlank()) {
            log.info("[DEV EMAIL] To={} Subject={} Body={}", to, subject, body);
            return;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, "UTF-8");
            h.setFrom(from); h.setTo(to); h.setSubject(subject); h.setText(body, false);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Email failed to {}: {}", to, e.getMessage());
            throw new RuntimeException(e);
        }
    }
}
