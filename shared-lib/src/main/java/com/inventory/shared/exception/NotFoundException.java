package com.inventory.shared.exception;

/** Entity not found — maps to HTTP 404. */
public class NotFoundException extends ServiceException {
    public NotFoundException(String entity, String id) {
        super(entity + " not found: " + id, 404);
    }
}
