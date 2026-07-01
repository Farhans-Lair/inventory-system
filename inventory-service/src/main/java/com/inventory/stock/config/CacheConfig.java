package com.inventory.stock.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Spring Cache configuration using Caffeine as the in-process cache provider.
 *
 * Two named caches, each with a 30-second TTL:
 *
 *   "products"    — used by ProductService.getAll() and ProductService.getById().
 *                   Every product page load hits this. Without caching, every
 *                   request runs a full table scan. Invalidated on every write
 *                   (create/update/delete/uploadImage) via @CacheEvict so users
 *                   never see stale data for more than 30 seconds and usually
 *                   see fresh data immediately.
 *
 *   "stockLevels" — used by StockService.getAllLevels() and getSummary().
 *                   The stock levels table is read on every stock page load and
 *                   the dashboard. Invalidated on recordMovement, updateThresholds,
 *                   and reservation state changes.
 *
 * Why in-process (Caffeine) instead of Redis?
 *   - Zero infra cost, zero latency, zero extra AWS resource
 *   - For a single-region deployment with small datasets (< 1000 products)
 *     the simple approach is correct; add Redis only when you have multiple
 *     write replicas that need a shared cache
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("products", "stockLevels");
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(30, TimeUnit.SECONDS));
        return manager;
    }
}
