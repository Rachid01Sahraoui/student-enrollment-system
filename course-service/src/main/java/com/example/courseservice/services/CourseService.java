package com.example.courseservice.services;

import com.example.courseservice.entities.Course;
import com.example.courseservice.exceptions.ResourceNotFoundException;
import com.example.courseservice.repositories.CourseRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CourseService {

    private final CourseRepository repository;

    public CourseService(CourseRepository repository) {
        this.repository = repository;
    }

    public List<Course> getAllCourses() {
        return repository.findAll();
    }

    public Course getCourseById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));
    }

    public Course createCourse(Course course) {
        return repository.save(course);
    }

    public Course updateCourse(Long id, Course newCourse) {
        Course existingCourse = getCourseById(id);

        existingCourse.setTitle(newCourse.getTitle());
        existingCourse.setDescription(newCourse.getDescription());
        existingCourse.setCredits(newCourse.getCredits());

        return repository.save(existingCourse);
    }

    public void deleteCourse(Long id) {
        Course course = getCourseById(id);
        repository.delete(course);
    }
}