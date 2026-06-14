package com.inventory.stock.infrastructure.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;
import java.util.UUID;

/**
 * S3 storage service for product images.
 *
 * Uses DefaultCredentialsProvider which automatically picks up the ECS task IAM role
 * — no static access key / secret key needed.
 *
 * The ECS task role (ecs_task in iam.tf) already has s3:GetObject, s3:PutObject,
 * s3:DeleteObject, s3:ListBucket on the images bucket.
 */
@Service
@Slf4j
public class MinioStorageService {

    private final S3Client    s3;
    private final S3Presigner presigner;
    private final String      bucket;
    private final String      region;

    public MinioStorageService(
            @Value("${aws.s3.region:ap-south-1}") String region,
            @Value("${minio.bucket:inventory-images}") String bucket) {
        this.bucket  = bucket;
        this.region  = region;

        // DefaultCredentialsProvider resolves credentials in this order:
        // 1. Environment variables (AWS_ACCESS_KEY_ID etc.)
        // 2. Java system properties
        // 3. ~/.aws/credentials file
        // 4. ECS task IAM role metadata endpoint  <-- this is what we use in prod
        // 5. EC2 instance profile
        this.s3 = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();

        this.presigner = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();

        log.info("S3 storage service initialized — bucket: {}, region: {}", bucket, region);
    }

    /** Upload an image and return the object key (stored in DB as imageUrl). */
    public String uploadImage(MultipartFile file, String productId) {
        String ext = getExtension(file.getOriginalFilename());
        String key = "products/" + productId + "/" + UUID.randomUUID() + ext;
        try {
            s3.putObject(
                PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build(),
                RequestBody.fromInputStream(file.getInputStream(), file.getSize())
            );
            log.debug("Uploaded image {} to S3 bucket {}", key, bucket);
            return key;
        } catch (Exception e) {
            log.error("S3 upload failed for product {}: {}", productId, e.getMessage());
            throw new RuntimeException("Image upload failed: " + e.getMessage());
        }
    }

    /** Generate a pre-signed GET URL valid for 1 hour. */
    public String getPresignedUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return null;
        // If already a full URL (legacy external link), return as-is
        if (objectKey.startsWith("http")) return objectKey;
        try {
            var presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofHours(1))
                    .getObjectRequest(r -> r.bucket(bucket).key(objectKey))
                    .build();
            return presigner.presignGetObject(presignRequest).url().toString();
        } catch (Exception e) {
            log.warn("Could not generate presigned URL for {}: {}", objectKey, e.getMessage());
            return objectKey;
        }
    }

    /** Delete an image by object key. */
    public void deleteImage(String objectKey) {
        if (objectKey == null || objectKey.isBlank() || objectKey.startsWith("http")) return;
        try {
            s3.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(objectKey)
                    .build());
            log.debug("Deleted image {} from S3 bucket {}", objectKey, bucket);
        } catch (Exception e) {
            log.warn("S3 delete failed for {}: {}", objectKey, e.getMessage());
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return ".bin";
        return filename.substring(filename.lastIndexOf("."));
    }
}
