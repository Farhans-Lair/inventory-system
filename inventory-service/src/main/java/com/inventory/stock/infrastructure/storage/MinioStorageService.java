package com.inventory.stock.infrastructure.storage;

import io.minio.*;
import io.minio.http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class MinioStorageService {

    private final MinioClient minio;
    private final String      bucket;

    public MinioStorageService(
            @Value("${minio.endpoint}") String endpoint,
            @Value("${minio.access-key}") String accessKey,
            @Value("${minio.secret-key}") String secretKey,
            @Value("${minio.bucket}") String bucket) {
        this.bucket = bucket;
        this.minio  = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
        ensureBucket();
    }

    /** Upload an image and return the object key (stored in DB as imageUrl). */
    public String uploadImage(MultipartFile file, String productId) {
        String ext = getExtension(file.getOriginalFilename());
        String key = "products/" + productId + "/" + UUID.randomUUID() + ext;
        try {
            minio.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(key)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());
            return key;
        } catch (Exception e) {
            log.error("MinIO upload failed: {}", e.getMessage());
            throw new RuntimeException("Image upload failed: " + e.getMessage());
        }
    }

    /** Generate a pre-signed GET URL valid for 1 hour. */
    public String getPresignedUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) return null;
        // If already a full URL (external), return as-is
        if (objectKey.startsWith("http")) return objectKey;
        try {
            return minio.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .method(Method.GET)
                    .expiry(1, TimeUnit.HOURS)
                    .build());
        } catch (Exception e) {
            log.warn("Could not generate presigned URL for {}: {}", objectKey, e.getMessage());
            return objectKey;
        }
    }

    public void deleteImage(String objectKey) {
        if (objectKey == null || objectKey.startsWith("http")) return;
        try {
            minio.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(objectKey).build());
        } catch (Exception e) {
            log.warn("MinIO delete failed for {}: {}", objectKey, e.getMessage());
        }
    }

    private void ensureBucket() {
        try {
            boolean exists = minio.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) minio.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        } catch (Exception e) {
            log.warn("Could not ensure MinIO bucket (MinIO may not be running): {}", e.getMessage());
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return ".bin";
        return filename.substring(filename.lastIndexOf("."));
    }
}
