package com.inventory.reporting.config;

import com.inventory.shared.storage.ReportStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ReportStorageConfig {

    @Bean
    public ReportStorageService reportStorageService(
            @Value("${aws.s3.region:ap-south-1}") String region,
            @Value("${reports.bucket:inventoryms-reports}") String bucket) {
        return new ReportStorageService(region, bucket);
    }
}
