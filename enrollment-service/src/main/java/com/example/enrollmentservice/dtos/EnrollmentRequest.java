package com.example.enrollmentservice.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class EnrollmentRequest {

    @NotBlank(message = "CNIE is required")
    private String studentCnie;

    @NotNull(message = "Course ID is required")
    @Positive(message = "Course ID must be positive")
    private Long courseId;

    public EnrollmentRequest() {
    }

    public String getStudentCnie() {
        return studentCnie;
    }

    public Long getCourseId() {
        return courseId;
    }

    public void setStudentCnie(String studentCnie) {
        this.studentCnie = studentCnie;
    }

    public void setCourseId(Long courseId) {
        this.courseId = courseId;
    }
}