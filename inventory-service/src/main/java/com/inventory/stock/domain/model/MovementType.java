package com.inventory.stock.domain.model;

public enum MovementType {
    INBOUND,    // Stock arriving into a location
    OUTBOUND,   // Stock leaving the system from a location
    TRANSFER    // Moving stock between two locations
}
