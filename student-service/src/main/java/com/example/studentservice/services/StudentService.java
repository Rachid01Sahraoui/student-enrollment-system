package com.example.studentservice.services;

import com.example.studentservice.entities.Student;
import com.example.studentservice.exceptions.ResourceNotFoundException;
import com.example.studentservice.repositories.StudentRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentService {

    private final StudentRepository repository;

    public StudentService(StudentRepository repository) {
        this.repository = repository;
    }

    public List<Student> getAllStudents() {
        return repository.findAll();
    }

    public Student getStudentById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));
    }

    public Student getStudentByCnie(String cnie) {
        return repository.findByCnie(cnie)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with CNIE: " + cnie));
    }

    public Student createStudent(Student student) {
        if (repository.existsByCnie(student.getCnie())) {
            throw new IllegalArgumentException("CNIE already exists");
        }

        if (repository.existsByEmail(student.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        student.setCnie(student.getCnie().toUpperCase());

        return repository.save(student);
    }

    public Student updateStudent(Long id, Student newStudent) {
        Student existingStudent = getStudentById(id);

        existingStudent.setCnie(newStudent.getCnie().toUpperCase());
        existingStudent.setFirstName(newStudent.getFirstName());
        existingStudent.setLastName(newStudent.getLastName());
        existingStudent.setEmail(newStudent.getEmail());

        return repository.save(existingStudent);
    }

    public void deleteStudent(Long id) {
        Student student = getStudentById(id);
        repository.delete(student);
    }
}