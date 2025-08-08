package com.example.demo.controller;

import com.example.demo.model.Pet;
import com.example.demo.repository.PetRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pets")
@CrossOrigin(origins = "*")
public class PetController {

    @Autowired
    private PetRepository petRepository;

    @PostMapping
    public Pet savePet(@RequestBody Pet pet) {
        return petRepository.save(pet);
    }

    @GetMapping
    public List<Pet> getAllPets() {
        return petRepository.findAll();
    }
}
