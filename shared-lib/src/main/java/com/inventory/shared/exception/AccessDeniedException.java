package com.inventory.shared.exception;

/** Insufficient role — maps to HTTP 403. */
public class AccessDeniedException extends ServiceException {
    public AccessDeniedException(String action) {
        super("Access denied: insufficient permissions to " + action, 403);
    }
}
