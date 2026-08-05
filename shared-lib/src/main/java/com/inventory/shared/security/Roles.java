package com.inventory.shared.security;

/**
 * Role name constants used in hasRole()/hasAnyRole() authorization rules.
 * These are plain Spring Security role names (no "ROLE_" prefix), matching
 * the role claim JwtAuthenticationFilter puts on the authenticated principal.
 * auth-service still owns the authoritative Role enum for its own domain
 * (user records); these constants exist for services that only need the
 * role name as a String for authorization checks.
 */
public final class Roles {

    private Roles() {}

    public static final String ADMIN             = "ADMIN";
    public static final String WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER";
    public static final String STAKEHOLDER       = "STAKEHOLDER";
}
