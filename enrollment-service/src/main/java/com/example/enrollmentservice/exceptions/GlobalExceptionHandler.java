package com.example.enrollmentservice.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClientRequestException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(StudentNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> handleStudentNotFound(StudentNotFoundException ex) {
        return buildError(404, "Not Found", ex.getMessage());
    }

    @ExceptionHandler(CourseNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> handleCourseNotFound(CourseNotFoundException ex) {
        return buildError(404, "Not Found", ex.getMessage());
    }

    @ExceptionHandler(EnrollmentNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> handleEnrollmentNotFound(EnrollmentNotFoundException ex) {
        return buildError(404, "Not Found", ex.getMessage());
    }

    @ExceptionHandler(CourseFullException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, Object> handleCourseFull(CourseFullException ex) {
        return buildError(409, "Conflict", ex.getMessage());
    }

    @ExceptionHandler(AlreadyEnrolledException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, Object> handleAlreadyEnrolled(AlreadyEnrolledException ex) {
        return buildError(409, "Conflict", ex.getMessage());
    }

    @ExceptionHandler(CancellationExpiredException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, Object> handleCancellationExpired(CancellationExpiredException ex) {
        return buildError(403, "Forbidden", ex.getMessage());
    }

    @ExceptionHandler(ForbiddenActionException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, Object> handleForbiddenAction(ForbiddenActionException ex) {
        return buildError(403, "Forbidden", ex.getMessage());
    }

    @ExceptionHandler(WebClientRequestException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Map<String, Object> handleRemoteServiceUnavailable(WebClientRequestException ex) {
        return buildError(503, "Service Unavailable", "Remote service unavailable");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, Object> error = new HashMap<>();
        Map<String, String> fields = new HashMap<>();

        ex.getBindingResult().getFieldErrors().forEach(fieldError ->
                fields.put(fieldError.getField(), fieldError.getDefaultMessage())
        );

        error.put("timestamp", LocalDateTime.now());
        error.put("status", 400);
        error.put("error", "Validation Error");
        error.put("fields", fields);

        return error;
    }

    private Map<String, Object> buildError(int status, String error, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", status);
        response.put("error", error);
        response.put("message", message);
        return response;
    }
}