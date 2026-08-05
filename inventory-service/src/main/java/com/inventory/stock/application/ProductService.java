package com.inventory.stock.application;

import com.inventory.stock.application.dto.*;
import com.inventory.stock.domain.model.*;
import com.inventory.stock.domain.repository.*;
import com.inventory.stock.infrastructure.barcode.BarcodeService;
import com.inventory.stock.infrastructure.storage.MinioStorageService;
import com.inventory.shared.storage.ReportStorageService;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository        productRepository;
    private final StockLevelRepository     stockLevelRepository;
    private final ProductVariantRepository variantRepository;
    private final MinioStorageService      storageService;
    private final ReportStorageService     reportStorageService;
    private final BarcodeService           barcodeService;

    // Generous cap for "list everything" endpoints — current catalog sizes are
    // nowhere near this, so no observable change today; it just removes the
    // unbounded-growth ceiling. CSV export intentionally stays unbounded
    // (exportToCsv uses productRepository.findAll()) since an export silently
    // dropping rows would be a real correctness problem, not a memory one.
    private static final int LIST_CAP = 2000;

    @Cacheable("products")
    public List<ProductDto> getAll() {
        return productRepository.findAll(LIST_CAP).stream().map(this::toDto).collect(Collectors.toList());
    }

    public ProductDto getById(String id) {
        return toDto(productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id)));
    }

    @CacheEvict(value = "products", allEntries = true)
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

    @CacheEvict(value = "products", allEntries = true)
    public ProductDto update(String id, ProductDto dto) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        p.setName(dto.getName());
        p.setDescription(dto.getDescription());
        p.setCategory(dto.getCategory());
        p.setUnit(dto.getUnit());
        p.setCostPrice(dto.getCostPrice());
        p.setSellingPrice(dto.getSellingPrice());
        p.setHasExpiryTracking(dto.isHasExpiryTracking());
        if (dto.getImageUrl() != null) p.setImageUrl(dto.getImageUrl());
        if (dto.getBarcodeValue() != null) p.setBarcodeValue(dto.getBarcodeValue());
        return toDto(productRepository.save(p));
    }

    public void deactivate(String id) {
        Product p = productRepository.findById(id).orElseThrow(() -> new RuntimeException("Product not found: " + id));
        p.setActive(false); productRepository.save(p);
    }

    public void activate(String id) {
        Product p = productRepository.findById(id).orElseThrow(() -> new RuntimeException("Product not found: " + id));
        p.setActive(true); productRepository.save(p);
    }

    @Transactional
    @CacheEvict(value = "products", allEntries = true)
    public ProductDto uploadImage(String productId, MultipartFile file) {
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        if (p.getImageUrl() != null && !p.getImageUrl().startsWith("http"))
            storageService.deleteImage(p.getImageUrl());
        String key = storageService.uploadImage(file, productId);
        p.setImageUrl(key);
        return toDto(productRepository.save(p));
    }

    public BarcodeResponse generateBarcode(String productId, String type) {
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));
        String value = p.getBarcodeValue() != null ? p.getBarcodeValue() : p.getSku();
        byte[] png = "QR".equalsIgnoreCase(type)
                ? barcodeService.generateQrCode(value, 250, 250)
                : barcodeService.generateBarcode(value, 400, 120);
        return BarcodeResponse.builder()
                .productId(productId).sku(p.getSku()).barcodeValue(value)
                .type(type.toUpperCase())
                .imageBase64(Base64.getEncoder().encodeToString(png))
                .build();
    }

    @CacheEvict(value = "products", allEntries = true)
    public List<ProductDto> importFromCsv(MultipartFile file) throws IOException {
        List<ProductDto> imported = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            br.readLine();
            String line;
            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] c = parseCsvLine(line);
                if (c.length < 5) continue;
                try {
                    ProductDto dto = new ProductDto();
                    dto.setSku(c[0].trim()); dto.setName(c[1].trim());
                    dto.setCategory(c[2].trim()); dto.setUnit(c[3].trim());
                    dto.setDescription(c[4].trim());
                    if (c.length > 5 && !c[5].isBlank()) dto.setCostPrice(new BigDecimal(c[5].trim()));
                    if (c.length > 6 && !c[6].isBlank()) dto.setSellingPrice(new BigDecimal(c[6].trim()));
                    if (c.length > 7 && !c[7].isBlank()) dto.setHasExpiryTracking(Boolean.parseBoolean(c[7].trim()));
                    if (!productRepository.existsBySku(dto.getSku())) imported.add(create(dto));
                } catch (Exception ignored) {}
            }
        }
        return imported;
    }

    public byte[] exportToCsv() {
        StringBuilder sb = new StringBuilder();
        sb.append("sku,name,category,unit,description,costPrice,sellingPrice,hasExpiryTracking,active,totalQuantity\n");
        // Builds rows straight from the Product entities instead of routing through
        // getAll()/toDto() — the CSV never uses imageUrl, barcodeValue, id, or
        // createdAt, so this also skips the per-product presigned-URL S3 call that
        // toDto() does purely for fields this export throws away.
        for (Product p : productRepository.findAll()) {
            int totalQuantity = stockLevelRepository.findByProductId(p.getId())
                    .stream().mapToInt(sl -> sl.getQuantity()).sum();
            sb.append(String.join(",",
                    safe(p.getSku()), safe(p.getName()), safe(p.getCategory()),
                    safe(p.getUnit()), safe(p.getDescription()),
                    p.getCostPrice()    != null ? p.getCostPrice().toString()    : "",
                    p.getSellingPrice() != null ? p.getSellingPrice().toString() : "",
                    String.valueOf(p.isHasExpiryTracking()),
                    String.valueOf(p.isActive()),
                    String.valueOf(totalQuantity)
            )).append("\n");
        }
        byte[] csv = sb.toString().getBytes(StandardCharsets.UTF_8);

        reportStorageService.uploadReport("inventory-service", "products-export", csv, "csv");
        return csv;
    }

    public List<ProductVariantDto> getVariants(String productId) {
        return variantRepository.findByProductId(productId)
                .stream().map(this::toVariantDto).collect(Collectors.toList());
    }

    public ProductVariantDto createVariant(String productId, ProductVariantDto dto) {
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));
        if (variantRepository.existsBySku(dto.getSku()))
            throw new RuntimeException("Variant SKU already exists: " + dto.getSku());
        ProductVariant v = ProductVariant.builder()
                .product(p).sku(dto.getSku()).name(dto.getName())
                .attributes(dto.getAttributes())
                .costPriceOverride(dto.getCostPriceOverride())
                .sellingPriceOverride(dto.getSellingPriceOverride())
                .imageUrl(dto.getImageUrl()).active(true).build();
        return toVariantDto(variantRepository.save(v));
    }

    public ProductVariantDto updateVariant(String variantId, ProductVariantDto dto) {
        ProductVariant v = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));
        v.setName(dto.getName());
        v.setAttributes(dto.getAttributes());
        v.setCostPriceOverride(dto.getCostPriceOverride());
        v.setSellingPriceOverride(dto.getSellingPriceOverride());
        v.setImageUrl(dto.getImageUrl());
        return toVariantDto(variantRepository.save(v));
    }

    public void toggleVariant(String variantId) {
        ProductVariant v = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));
        v.setActive(!v.isActive());
        variantRepository.save(v);
    }

    private ProductDto toDto(Product p) {
        int total = stockLevelRepository.findByProductId(p.getId())
                .stream().mapToInt(sl -> sl.getQuantity()).sum();

        String imageUrl = storageService.getPresignedUrl(p.getImageUrl());
        return ProductDto.builder()
                .id(p.getId()).sku(p.getSku()).name(p.getName())
                .description(p.getDescription()).category(p.getCategory())
                .unit(p.getUnit()).imageUrl(imageUrl)
                .costPrice(p.getCostPrice()).sellingPrice(p.getSellingPrice())
                .barcodeValue(p.getBarcodeValue())
                .hasExpiryTracking(p.isHasExpiryTracking())
                .active(p.isActive()).createdAt(p.getCreatedAt())
                .totalQuantity(total).build();
    }

    private ProductVariantDto toVariantDto(ProductVariant v) {
        return ProductVariantDto.builder()
                .id(v.getId()).productId(v.getProduct().getId())
                .productName(v.getProduct().getName())
                .sku(v.getSku()).name(v.getName())
                .attributes(v.getAttributes()).attributesMap(v.getAttributesMap())
                .costPriceOverride(v.getCostPriceOverride())
                .sellingPriceOverride(v.getSellingPriceOverride())
                .imageUrl(storageService.getPresignedUrl(v.getImageUrl()))
                .active(v.isActive()).createdAt(v.getCreatedAt()).build();
    }

    private String safe(String s) {
        if (s == null) return "";
        return s.contains(",") ? "\"" + s.replace("\"", "\"\"") + "\"" : s;
    }

    private String[] parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        boolean inQuote = false;
        StringBuilder sb = new StringBuilder();
        for (char ch : line.toCharArray()) {
            if (ch == '"') { inQuote = !inQuote; }
            else if (ch == ',' && !inQuote) { result.add(sb.toString()); sb.setLength(0); }
            else { sb.append(ch); }
        }
        result.add(sb.toString());
        return result.toArray(new String[0]);
    }
}
