package com.example.enrollmentservice.dtos;

public class StudentDTO {

    private Long id;
    private String cnie;
    private String firstName;
    private String lastName;
    private String email;

    public StudentDTO() {
    }

    public Long getId() {
        return id;
    }

    public String getCnie() {
        return cnie;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setCnie(String cnie) {
        this.cnie = cnie;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}