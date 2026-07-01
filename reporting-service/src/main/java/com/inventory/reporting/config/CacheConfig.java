package com.inventory.reporting.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Spring Cache configuration for reporting-service.
 *
 * "valuation" cache (60s TTL): the getStockValuation() query is a native
 * SQL join across the entire inventorydb.products + stock_levels tables.
 * It's called on every valuation page load AND on every CSV export. A 60s
 * TTL means a burst of 10 concurrent users all see the same DB query fired
 * once, not 10 times. After 60s the next request refreshes the cache.
 *
 * The cache is intentionally read-only (no @CacheEvict): reporting-service
 * has no write endpoints and reads from inventorydb directly (not through
 * inventory-service), so there's no mutation path to listen to. 60s
 * staleness is acceptable for a reporting/analytics view.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("valuation");
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(100)
                .expireAfterWrite(60, TimeUnit.SECONDS));
        return manager;
    }
}
