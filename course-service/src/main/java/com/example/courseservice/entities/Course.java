package com.example.courseservice.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Course title is required")
    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Min(value = 1, message = "Credits must be greater than 0")
    @Column(nullable = false)
    private int credits;

    public Course() {
    }

    public Course(Long id, String title, String description, int credits) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.credits = credits;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public int getCredits() {
        return credits;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setCredits(int credits) {
        this.credits = credits;
    }
}