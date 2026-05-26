package com.inventory.stock.application;

import com.inventory.stock.application.dto.ProductDto;
import com.inventory.stock.domain.model.Product;
import com.inventory.stock.domain.repository.ProductRepository;
import com.inventory.stock.domain.repository.StockLevelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository    productRepository;
    private final StockLevelRepository stockLevelRepository;

    public List<ProductDto> getAll() {
        return productRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public ProductDto getById(String id) {
        return toDto(productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id)));
    }

    public ProductDto create(ProductDto dto) {
        if (productRepository.existsBySku(dto.getSku()))
            throw new RuntimeException("SKU already exists: " + dto.getSku());
        Product p = Product.builder()
                .sku(dto.getSku()).name(dto.getName())
                .description(dto.getDescription()).category(dto.getCategory())
                .unit(dto.getUnit()).imageUrl(dto.getImageUrl())
                .costPrice(dto.getCostPrice()).sellingPrice(dto.getSellingPrice())
                .barcodeValue(dto.getBarcodeValue() != null ? dto.getBarcodeValue() : dto.getSku())
                .hasExpiryTracking(dto.isHasExpiryTracking())
                .active(true).build();
        return toDto(productRepository.save(p));
    }

    public ProductDto update(String id, ProductDto dto) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        p.setName(dto.getName());
        p.setDescription(dto.getDescription());
        p.setCategory(dto.getCategory());
        p.setUnit(dto.getUnit());
        p.setImageUrl(dto.getImageUrl());
        p.setCostPrice(dto.getCostPrice());
        p.setSellingPrice(dto.getSellingPrice());
        p.setHasExpiryTracking(dto.isHasExpiryTracking());
        if (dto.getBarcodeValue() != null) p.setBarcodeValue(dto.getBarcodeValue());
        return toDto(productRepository.save(p));
    }

    public void deactivate(String id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        p.setActive(false);
        productRepository.save(p);
    }

    public void activate(String id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        p.setActive(true);
        productRepository.save(p);
    }

    // ── Bulk CSV import ───────────────────────────────────────────────────
    public List<ProductDto> importFromCsv(MultipartFile file) throws IOException {
        List<ProductDto> imported = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String header = br.readLine(); // skip header
            String line;
            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] cols = line.split(",", -1);
                if (cols.length < 5) continue;
                try {
                    ProductDto dto = new ProductDto();
                    dto.setSku(cols[0].trim());
                    dto.setName(cols[1].trim());
                    dto.setCategory(cols[2].trim());
                    dto.setUnit(cols[3].trim());
                    dto.setDescription(cols[4].trim());
                    if (cols.length > 5 && !cols[5].isBlank())
                        dto.setCostPrice(new BigDecimal(cols[5].trim()));
                    if (cols.length > 6 && !cols[6].isBlank())
                        dto.setSellingPrice(new BigDecimal(cols[6].trim()));
                    if (!productRepository.existsBySku(dto.getSku()))
                        imported.add(create(dto));
                } catch (Exception ignored) {}
            }
        }
        return imported;
    }

    // ── CSV export ────────────────────────────────────────────────────────
    public byte[] exportToCsv() {
        StringBuilder sb = new StringBuilder();
        sb.append("sku,name,category,unit,description,costPrice,sellingPrice,active,totalQuantity\n");
        for (ProductDto p : getAll()) {
            sb.append(String.join(",",
                    safe(p.getSku()), safe(p.getName()), safe(p.getCategory()),
                    safe(p.getUnit()), safe(p.getDescription()),
                    p.getCostPrice()    != null ? p.getCostPrice().toString()    : "",
                    p.getSellingPrice() != null ? p.getSellingPrice().toString() : "",
                    String.valueOf(p.isActive()),
                    String.valueOf(p.getTotalQuantity())
            )).append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String safe(String s) {
        if (s == null) return "";
        return s.contains(",") ? "\"" + s.replace("\"", "\"\"") + "\"" : s;
    }

    private ProductDto toDto(Product p) {
        int total = stockLevelRepository.findByProductId(p.getId())
                .stream().mapToInt(sl -> sl.getQuantity()).sum();
        return ProductDto.builder()
                .id(p.getId()).sku(p.getSku()).name(p.getName())
                .description(p.getDescription()).category(p.getCategory())
                .unit(p.getUnit()).imageUrl(p.getImageUrl())
                .costPrice(p.getCostPrice()).sellingPrice(p.getSellingPrice())
                .barcodeValue(p.getBarcodeValue())
                .hasExpiryTracking(p.isHasExpiryTracking())
                .active(p.isActive()).createdAt(p.getCreatedAt())
                .totalQuantity(total).build();
    }
}
