package com.inventory.shared.storage;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Uploads generated report files (CSV exports, etc.) to the shared reports
 * S3 bucket. Each service wires this as a @Bean in its own @Configuration,
 * supplying its region/bucket via @Value — this class itself stays a plain,
 * framework-agnostic component so it isn't tied to any one service's
 * component scan.
 */
@Slf4j
public class ReportStorageService {

    private static final DateTimeFormatter TS_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    private final S3Client s3;
    private final String   bucket;

    public ReportStorageService(String region, String bucket) {
        this.bucket = bucket;
        this.s3 = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
        log.info("Report storage service initialized — bucket: {}, region: {}", bucket, region);
    }

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

            log.error("Failed to store report {} to S3: {}", key, e.getMessage());
            return null;
        }
    }
}
