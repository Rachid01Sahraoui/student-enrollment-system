package com.example.enrollmentservice.clients;

import com.example.enrollmentservice.dtos.CourseDTO;
import com.example.enrollmentservice.exceptions.CourseNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
public class CourseClient {

    private final WebClient webClient;

    public CourseClient(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("http://course-service")
                .build();
    }

    public CourseDTO findById(Long id) {
        return webClient.get()
                .uri("/api/courses/{id}", id)
                .retrieve()
                .onStatus(
                        status -> status.value() == 404,
                        response -> Mono.error(new CourseNotFoundException("Course not found with id: " + id))
                )
                .bodyToMono(CourseDTO.class)
                .block();
    }
}