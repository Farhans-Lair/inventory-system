package com.inventory.reporting.infrastructure.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Persists generated report files (CSV today, potentially other formats
 * later) to S3 for compliance / audit retention — every report ever
 * generated stays retrievable, independent of the original HTTP response.
 *
 * Each report is written under a module-specific folder so reports stay
 * organized by which part of the system produced them:
 *   reports/<module>/<reportName>-<timestamp>.<ext>
 *
 * Uses the same DefaultCredentialsProvider pattern as MinioStorageService —
 * no static AWS keys, picks up the ECS task IAM role automatically.
 */
@Service
@Slf4j
public class ReportStorageService {

    private static final DateTimeFormatter TS_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    private final S3Client s3;
    private final String   bucket;

    public ReportStorageService(
            @Value("${aws.s3.region:ap-south-1}") String region,
            @Value("${reports.bucket:inventoryms-reports}") String bucket) {
        this.bucket = bucket;
        this.s3 = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
        log.info("Report storage service initialized — bucket: {}, region: {}", bucket, region);
    }

    /**
     * Uploads a generated report file to S3 under reports/{module}/.
     *
     * @param module     the module/service the report belongs to, used as the
     *                   S3 folder name (e.g. "inventory-service")
     * @param reportName short descriptive name for the report (e.g. "products-export")
     * @param content    the file bytes (e.g. CSV content)
     * @param extension  file extension without the dot (e.g. "csv")
     * @return the S3 object key the report was stored under, or null if the upload failed
     */
    public String uploadReport(String module, String reportName, byte[] content, String extension) {
        String key = "reports/%s/%s-%s.%s".formatted(
                module, reportName, LocalDateTime.now().format(TS_FORMAT), extension);
        try {
            s3.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(extension.equals("csv") ? "text/csv" : "application/octet-stream")
                            .contentLength((long) content.length)
                            .build(),
                    RequestBody.fromBytes(content)
            );
            log.info("Stored report {} in S3 bucket {} ({} bytes)", key, bucket, content.length);
            return key;
        } catch (Exception e) {
            // A report-archival failure should never block the user's download —
            // log it and let the caller still return the report bytes to the client.
            log.error("Failed to store report {} to S3: {}", key, e.getMessage());
            return null;
        }
    }
}
