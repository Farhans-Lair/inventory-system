package com.inventory.stock.application;

import com.inventory.stock.application.dto.BatchLotDto;
import com.inventory.stock.domain.model.*;
import com.inventory.stock.domain.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BatchLotService {

    private final BatchLotRepository  batchLotRepository;
    private final ProductRepository   productRepository;
    private final LocationRepository  locationRepository;

    public BatchLotDto create(BatchLotDto dto) {
        Product p = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));
        Location l = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new RuntimeException("Location not found"));
        BatchLot lot = BatchLot.builder()
                .product(p).location(l).lotNumber(dto.getLotNumber())
                .manufactureDate(dto.getManufactureDate()).expiryDate(dto.getExpiryDate())
                .quantity(dto.getQuantity()).build();
        return toDto(batchLotRepository.save(lot));
    }

    public List<BatchLotDto> getByProduct(String productId) {
        return batchLotRepository.findByProductId(productId).stream()
                .map(this::toDto).collect(Collectors.toList());
    }

    public List<BatchLotDto> getExpiringSoon(int days) {
        return batchLotRepository.findExpiringSoon(LocalDate.now().plusDays(days))
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<BatchLotDto> getExpired() {
        return batchLotRepository.findExpired(LocalDate.now())
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    private BatchLotDto toDto(BatchLot b) {
        return BatchLotDto.builder()
                .id(b.getId())
                .productId(b.getProduct().getId()).productName(b.getProduct().getName())
                .locationId(b.getLocation().getId()).locationName(b.getLocation().getName())
                .lotNumber(b.getLotNumber()).manufactureDate(b.getManufactureDate())
                .expiryDate(b.getExpiryDate()).quantity(b.getQuantity())
                .expired(b.isExpired()).expiringSoon(b.isExpiringSoon(30))
                .createdAt(b.getCreatedAt()).build();
    }
}
