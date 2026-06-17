package com.example.studentservice.config;

import com.example.studentservice.entities.Student;
import com.example.studentservice.repositories.StudentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initStudents(StudentRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                repository.save(new Student(null, "CD2387", "Rachid", "Sahraoui", "rachid.sahraoui@example.com"));
                repository.save(new Student(null, "AB1234", "Sara", "El Amrani", "sara.elamrani@example.com"));
                repository.save(new Student(null, "ZH9090", "Youssef", "Benali", "youssef.benali@example.com"));
                repository.save(new Student(null, "MA5555", "Imane", "Alaoui", "imane.alaoui@example.com"));
            }
        };
    }
}