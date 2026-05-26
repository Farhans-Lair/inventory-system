package com.inventory.stock.application;

import com.inventory.stock.domain.model.*;
import com.inventory.stock.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final ProductRepository  productRepository;
    private final LocationRepository locationRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (!productRepository.findAll().isEmpty()) return;

        // Sample locations
        Location zoneA1 = locationRepository.save(Location.builder().name("Zone-A Shelf-01").zone("A").description("Fast-moving goods").capacity(500).active(true).build());
        Location zoneA2 = locationRepository.save(Location.builder().name("Zone-A Shelf-02").zone("A").description("Fast-moving goods").capacity(500).active(true).build());
        Location zoneB1 = locationRepository.save(Location.builder().name("Zone-B Shelf-01").zone("B").description("Medium-moving goods").capacity(300).active(true).build());
        Location zoneC1 = locationRepository.save(Location.builder().name("Zone-C Cold-01" ).zone("C").description("Cold storage").capacity(200).active(true).build());

        // Sample products
        productRepository.save(Product.builder().sku("SKU-001").name("Wireless Keyboard").category("Electronics").unit("pcs").active(true).build());
        productRepository.save(Product.builder().sku("SKU-002").name("USB-C Cable 2m").category("Electronics").unit("pcs").active(true).build());
        productRepository.save(Product.builder().sku("SKU-003").name("Office Chair").category("Furniture").unit("pcs").active(true).build());
        productRepository.save(Product.builder().sku("SKU-004").name("Copy Paper A4").category("Stationery").unit("boxes").active(true).build());
        productRepository.save(Product.builder().sku("SKU-005").name("Bottled Water 500ml").category("Consumables").unit("pcs").active(true).build());

        log.info("Sample products and locations seeded.");
    }
}
