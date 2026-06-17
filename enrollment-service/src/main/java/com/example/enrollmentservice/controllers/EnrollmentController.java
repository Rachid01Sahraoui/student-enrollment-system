package com.example.enrollmentservice.controllers;

import com.example.enrollmentservice.dtos.EnrollmentRequest;
import com.example.enrollmentservice.dtos.EnrollmentResponseDTO;
import com.example.enrollmentservice.services.EnrollmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/enrollments")
public class EnrollmentController {

    private final EnrollmentService service;

    public EnrollmentController(EnrollmentService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EnrollmentResponseDTO enrollStudent(@Valid @RequestBody EnrollmentRequest request) {
        return service.enrollStudent(request);
    }

    @GetMapping("/me")
    public List<EnrollmentResponseDTO> getMyEnrollments(@RequestParam String cnie) {
        return service.getMyEnrollments(cnie);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelEnrollment(
            @PathVariable Long id,
            @RequestParam String cnie
    ) {
        service.cancelEnrollment(id, cnie);
    }

    @GetMapping("/course/{courseId}/count")
    public long countByCourse(@PathVariable Long courseId) {
        return service.countEnrollmentsByCourse(courseId);
    }
}