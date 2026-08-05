package com.inventory.auth.infrastructure.persistence;

import com.inventory.auth.domain.model.Role;
import com.inventory.auth.domain.model.User;
import com.inventory.auth.domain.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface JpaUserRepository extends JpaRepository<User, String>, UserRepository {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByRole(Role role);

    default List<User> findAll(int limit) {
        return findAll(PageRequest.of(0, limit)).getContent();
    }
}
