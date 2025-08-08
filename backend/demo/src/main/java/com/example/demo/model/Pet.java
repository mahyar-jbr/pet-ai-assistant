package com.example.demo.model;

import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(
   collection = "pets"
)
public class Pet {
   @Id
   private String id;
   private String name;
   private String breed;
   private String ageGroup;
   private String activityLevel;
   private String weightGoal;
   private List<String> allergies;

   public Pet() {
   }

   public Pet(String name, String breed, String ageGroup, String activityLevel, String weightGoal, List<String> allergies) {
      this.name = name;
      this.breed = breed;
      this.ageGroup = ageGroup;
      this.activityLevel = activityLevel;
      this.weightGoal = weightGoal;
      this.allergies = allergies;
   }

   public String getId() {
      return this.id;
   }

   public void setId(String id) {
      this.id = id;
   }

   public String getName() {
      return this.name;
   }

   public void setName(String name) {
      this.name = name;
   }

   public String getBreed() {
      return this.breed;
   }

   public void setBreed(String breed) {
      this.breed = breed;
   }

   public String getAgeGroup() {
      return this.ageGroup;
   }

   public void setAgeGroup(String ageGroup) {
      this.ageGroup = ageGroup;
   }

   public String getActivityLevel() {
      return this.activityLevel;
   }

   public void setActivityLevel(String activityLevel) {
      this.activityLevel = activityLevel;
   }

   public String getWeightGoal() {
      return this.weightGoal;
   }

   public void setWeightGoal(String weightGoal) {
      this.weightGoal = weightGoal;
   }

   public List<String> getAllergies() {
      return this.allergies;
   }

   public void setAllergies(List<String> allergies) {
      this.allergies = allergies;
   }
}
