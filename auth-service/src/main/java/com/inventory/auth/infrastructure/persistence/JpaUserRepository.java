package com.inventory.auth.infrastructure.persistence;

import com.inventory.auth.domain.model.Role;
import com.inventory.auth.domain.model.User;
import com.inventory.auth.domain.repository.UserRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface JpaUserRepository extends JpaRepository<User, String>, UserRepository {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRole(Role role);
}
