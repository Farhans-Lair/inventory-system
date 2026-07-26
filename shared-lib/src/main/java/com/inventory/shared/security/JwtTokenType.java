package com.inventory.shared.security;

public enum JwtTokenType {
    SESSION("session"),
    ACCESS("access"),
    REFRESH("refresh");

    private final String value;

    JwtTokenType(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }
}
