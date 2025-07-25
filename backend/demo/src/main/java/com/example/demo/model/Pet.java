package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "pets")
public class Pet {

    @Id
    private String id;
    private String name;
    private String breedSize;       // small, medium, large
    private String ageGroup;        // puppy, adult, senior
    private String activityLevel;
    private String weightGoal;      // maintenance, weight-loss, muscle-gain
    private List<String> allergies;

    // Constructors
    public Pet() {}

    public Pet(String name, String breedSize, String ageGroup, String activityLevel, String weightGoal, List<String> allergies) {
        this.name = name;
        this.breedSize = breedSize;
        this.ageGroup = ageGroup;
        this.activityLevel = activityLevel;
        this.weightGoal = weightGoal;
        this.allergies = allergies;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getBreedSize() { return breedSize; }
    public void setBreedSize(String breedSize) { this.breedSize = breedSize; }

    public String getAgeGroup() { return ageGroup; }
    public void setAgeGroup(String ageGroup) { this.ageGroup = ageGroup; }

    public String getActivityLevel() { return activityLevel; }
    public void setActivityLevel(String activityLevel) { this.activityLevel = activityLevel; }

    public String getWeightGoal() { return weightGoal; }
    public void setWeightGoal(String weightGoal) { this.weightGoal = weightGoal; }

    public List<String> getAllergies() { return allergies; }
    public void setAllergies(List<String> allergies) { this.allergies = allergies; }
}