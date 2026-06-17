package com.example.courseservice.config;

import com.example.courseservice.entities.Course;
import com.example.courseservice.repositories.CourseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initCourses(CourseRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                repository.save(new Course(
                        null,
                        "Spring Framework",
                        "Introduction to Spring Boot, REST APIs, dependency injection and microservices.",
                        4
                ));

                repository.save(new Course(
                        null,
                        "Data Mining",
                        "Data preprocessing, classification, clustering and pattern discovery.",
                        3
                ));

                repository.save(new Course(
                        null,
                        "Cloud Computing",
                        "Cloud architecture, deployment models and scalable applications.",
                        3
                ));

                repository.save(new Course(
                        null,
                        "Software Architecture",
                        "Design patterns, layered architecture and scalable system design.",
                        4
                ));

                repository.save(new Course(
                        null,
                        "Web Development",
                        "Frontend, backend, REST APIs and modern web application design.",
                        3
                ));
            }
        };
    }
}