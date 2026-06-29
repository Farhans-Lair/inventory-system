package com.inventory.auth.domain.repository;

import com.inventory.auth.domain.model.Role;
import com.inventory.auth.domain.model.User;
import java.util.List;
import java.util.Optional;

public interface UserRepository {
    Optional<User> findByEmail(String email);
    Optional<User> findById(String id);
    User save(User user);
    boolean existsByEmail(String email);
    List<User> findAll();
    void deleteById(String id);
    long countByRole(Role role);
}
