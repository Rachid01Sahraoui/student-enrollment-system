package com.example.enrollmentservice.exceptions;

public class AlreadyEnrolledException extends RuntimeException {

    public AlreadyEnrolledException(String message) {
        super(message);
    }
}