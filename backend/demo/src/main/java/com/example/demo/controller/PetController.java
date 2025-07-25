package com.example.demo.controller;

import com.example.demo.model.Pet;
import com.example.demo.repository.PetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pets")
@CrossOrigin(origins = "*") // Allow requests from any front end during dev
public class PetController {

    @Autowired
    private PetRepository petRepository;

    // POST /api/pets → Save a new pet profile
    @PostMapping
    public Pet savePet(@RequestBody Pet pet) {
        return petRepository.save(pet);
    }

    // GET /api/pets → Fetch all saved pets (optional for now)
    @GetMapping
    public List<Pet> getAllPets() {
        return petRepository.findAll();
    }
}
