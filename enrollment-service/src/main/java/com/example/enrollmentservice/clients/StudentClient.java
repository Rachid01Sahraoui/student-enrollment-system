package com.example.enrollmentservice.clients;

import com.example.enrollmentservice.dtos.StudentDTO;
import com.example.enrollmentservice.exceptions.StudentNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
public class StudentClient {

    private final WebClient webClient;

    public StudentClient(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("http://student-service")
                .build();
    }

    public StudentDTO findByCnie(String cnie) {
        return webClient.get()
                .uri("/api/students/cnie/{cnie}", cnie)
                .retrieve()
                .onStatus(
                        status -> status.value() == 404,
                        response -> Mono.error(new StudentNotFoundException("Student not found with CNIE: " + cnie))
                )
                .bodyToMono(StudentDTO.class)
                .block();
    }
}