package com.inventory.stock.application;

import com.inventory.stock.application.dto.UomConversionDto;
import com.inventory.stock.domain.model.UomConversion;
import com.inventory.stock.domain.repository.UomConversionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UomService {

    private final UomConversionRepository repo;

    public List<UomConversionDto> getAll() {
        return repo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public UomConversionDto create(UomConversionDto dto) {
        if (repo.findByFromUnitAndToUnit(dto.getFromUnit(), dto.getToUnit()).isPresent())
            throw new RuntimeException("Conversion from " + dto.getFromUnit() + " to " + dto.getToUnit() + " already exists");
        UomConversion c = UomConversion.builder()
                .fromUnit(dto.getFromUnit()).toUnit(dto.getToUnit())
                .factor(dto.getFactor()).description(dto.getDescription()).build();
        return toDto(repo.save(c));
    }

    public UomConversionDto update(String id, UomConversionDto dto) {
        UomConversion c = repo.findById(id).orElseThrow(() -> new RuntimeException("Conversion not found"));
        c.setFactor(dto.getFactor()); c.setDescription(dto.getDescription());
        return toDto(repo.save(c));
    }

    public void delete(String id) { repo.deleteById(id); }

    /**
     * Convert a quantity from one unit to another.
     * Tries direct conversion first, then reverse.
     */
    public UomConversionDto convert(String fromUnit, String toUnit, double quantity) {
        // Try direct
        var direct = repo.findByFromUnitAndToUnit(fromUnit, toUnit);
        if (direct.isPresent()) {
            UomConversion c = direct.get();
            return toDto(c, quantity, c.convert(quantity));
        }
        // Try reverse
        var reverse = repo.findByFromUnitAndToUnit(toUnit, fromUnit);
        if (reverse.isPresent()) {
            UomConversion c = reverse.get();
            return toDto(c, quantity, c.convertReverse(quantity));
        }
        throw new RuntimeException("No conversion rule found between " + fromUnit + " and " + toUnit);
    }

    private UomConversionDto toDto(UomConversion c) {
        return UomConversionDto.builder().id(c.getId())
                .fromUnit(c.getFromUnit()).toUnit(c.getToUnit())
                .factor(c.getFactor()).description(c.getDescription()).build();
    }

    private UomConversionDto toDto(UomConversion c, double inputQty, double outputQty) {
        return UomConversionDto.builder().id(c.getId())
                .fromUnit(c.getFromUnit()).toUnit(c.getToUnit())
                .factor(c.getFactor()).description(c.getDescription())
                .convertedQuantity(outputQty).build();
    }
}
