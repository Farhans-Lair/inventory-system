package com.inventory.stock.application;

import com.inventory.stock.application.dto.LocationDto;
import com.inventory.stock.domain.model.Location;
import com.inventory.stock.domain.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;

    public List<LocationDto> getAll() {
        return locationRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public LocationDto getById(String id) {
        return toDto(locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Location not found: " + id)));
    }

    public LocationDto create(LocationDto dto) {
        if (locationRepository.existsByName(dto.getName()))
            throw new RuntimeException("Location name already exists: " + dto.getName());

        Location loc = Location.builder()
                .name(dto.getName()).zone(dto.getZone())
                .description(dto.getDescription()).capacity(dto.getCapacity())
                .active(true).build();
        return toDto(locationRepository.save(loc));
    }

    public LocationDto update(String id, LocationDto dto) {
        Location loc = locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Location not found: " + id));
        loc.setName(dto.getName());
        loc.setZone(dto.getZone());
        loc.setDescription(dto.getDescription());
        loc.setCapacity(dto.getCapacity());
        return toDto(locationRepository.save(loc));
    }

    private LocationDto toDto(Location l) {
        return LocationDto.builder()
                .id(l.getId()).name(l.getName()).zone(l.getZone())
                .description(l.getDescription()).capacity(l.getCapacity())
                .active(l.isActive()).build();
    }
}
