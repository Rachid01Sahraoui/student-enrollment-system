package com.example.enrollmentservice.services;

import com.example.enrollmentservice.clients.CourseClient;
import com.example.enrollmentservice.clients.StudentClient;
import com.example.enrollmentservice.dtos.CourseDTO;
import com.example.enrollmentservice.dtos.EnrollmentRequest;
import com.example.enrollmentservice.dtos.EnrollmentResponseDTO;
import com.example.enrollmentservice.dtos.StudentDTO;
import com.example.enrollmentservice.entities.Enrollment;
import com.example.enrollmentservice.exceptions.*;
import com.example.enrollmentservice.repositories.EnrollmentRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class EnrollmentService {

    private static final int MAX_STUDENTS_PER_COURSE = 3;

    private final EnrollmentRepository repository;
    private final StudentClient studentClient;
    private final CourseClient courseClient;

    public EnrollmentService(
            EnrollmentRepository repository,
            StudentClient studentClient,
            CourseClient courseClient
    ) {
        this.repository = repository;
        this.studentClient = studentClient;
        this.courseClient = courseClient;
    }

    public EnrollmentResponseDTO enrollStudent(EnrollmentRequest request) {
        String cnie = request.getStudentCnie().toUpperCase();

        StudentDTO student = studentClient.findByCnie(cnie);
        CourseDTO course = courseClient.findById(request.getCourseId());

        boolean alreadyEnrolled = repository.existsByStudentIdAndCourseId(
                student.getId(),
                course.getId()
        );

        if (alreadyEnrolled) {
            throw new AlreadyEnrolledException("Student already enrolled in this course");
        }

        long currentCount = repository.countByCourseId(course.getId());

        if (currentCount >= MAX_STUDENTS_PER_COURSE) {
            throw new CourseFullException("Course capacity reached");
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setStudentId(student.getId());
        enrollment.setCourseId(course.getId());
        enrollment.setEnrollmentDate(LocalDateTime.now());

        Enrollment savedEnrollment = repository.save(enrollment);

        return toResponseDTO(savedEnrollment, student, course);
    }

    public List<EnrollmentResponseDTO> getMyEnrollments(String cnie) {
        StudentDTO student = studentClient.findByCnie(cnie.toUpperCase());

        List<Enrollment> enrollments = repository.findByStudentId(student.getId());

        return enrollments.stream()
                .map(enrollment -> {
                    CourseDTO course = courseClient.findById(enrollment.getCourseId());
                    return toResponseDTO(enrollment, student, course);
                })
                .toList();
    }

    public void cancelEnrollment(Long enrollmentId, String cnie) {
        StudentDTO student = studentClient.findByCnie(cnie.toUpperCase());

        Enrollment enrollment = repository.findById(enrollmentId)
                .orElseThrow(() -> new EnrollmentNotFoundException("Enrollment not found with id: " + enrollmentId));

        if (!enrollment.getStudentId().equals(student.getId())) {
            throw new ForbiddenActionException("You cannot cancel another student's enrollment");
        }

        if (!isDeletable(enrollment.getEnrollmentDate())) {
            throw new CancellationExpiredException("Cancellation period expired");
        }

        repository.delete(enrollment);
    }

    public long countEnrollmentsByCourse(Long courseId) {
        courseClient.findById(courseId);
        return repository.countByCourseId(courseId);
    }

    private EnrollmentResponseDTO toResponseDTO(
            Enrollment enrollment,
            StudentDTO student,
            CourseDTO course
    ) {
        return new EnrollmentResponseDTO(
                enrollment.getId(),
                student.getCnie(),
                course.getTitle(),
                enrollment.getEnrollmentDate().toString(),
                isDeletable(enrollment.getEnrollmentDate())
        );
    }

    private boolean isDeletable(LocalDateTime enrollmentDate) {
        return enrollmentDate.plusHours(24).isAfter(LocalDateTime.now());
    }
}