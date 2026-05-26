package com.inventory.auth.infrastructure.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public boolean isEmailConfigured() {
        return mailSender != null && !mailUsername.isBlank();
    }

    public void sendOtp(String toEmail, String otp, String purpose) {
        if (!isEmailConfigured()) {
            log.warn("==============================================================");
            log.warn("  [DEV MODE] OTP for {} = {}", toEmail, otp);
            log.warn("  Purpose: {} | Expires in 10 minutes", purpose);
            log.warn("==============================================================");
            return;
        }
        try {
            var msg    = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(msg, false, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Inventory MS — Your verification code");
            helper.setText(buildHtml(otp, purpose), true);
            mailSender.send(msg);
            log.info("OTP email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            log.warn("  [FALLBACK] OTP for {} = {}", toEmail, otp);
        }
    }

    private String buildHtml(String otp, String purpose) {
        String action = "SIGNUP".equals(purpose) ? "complete your registration" : "sign in";
        return "<div style=\"font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px\">"
            + "<div style=\"font-size:22px;font-weight:700;color:#1e1b4b;margin-bottom:8px\">Inventory MS</div>"
            + "<p style=\"color:#374151;margin-bottom:24px\">Use the code below to " + action + ".</p>"
            + "<div style=\"background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;"
            +   "padding:28px;text-align:center;margin-bottom:24px\">"
            + "<div style=\"font-size:36px;font-weight:700;letter-spacing:10px;color:#4f46e5\">" + otp + "</div>"
            + "</div>"
            + "<p style=\"color:#6b7280;font-size:13px\">Expires in <strong>10 minutes</strong>. Do not share it.</p>"
            + "</div>";
    }
}
