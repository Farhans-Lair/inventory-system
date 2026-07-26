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
