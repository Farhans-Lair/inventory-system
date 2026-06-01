package com.inventory.shared.exception;

/**
 * Base exception for all business-rule violations.
 * Map to HTTP 400 at the controller advice level.
 */
public class ServiceException extends RuntimeException {
    private final int statusCode;
    public ServiceException(String message)             { super(message); this.statusCode = 400; }
    public ServiceException(String message, int status) { super(message); this.statusCode = status; }
    public int getStatusCode() { return statusCode; }
}
