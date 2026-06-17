package com.example.enrollmentservice.exceptions;

public class CancellationExpiredException extends RuntimeException {

    public CancellationExpiredException(String message) {
        super(message);
    }
}