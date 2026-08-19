package hu.bumler.lm2.auth;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface UserRepository extends JpaRepository<User, UUID> {

	Optional<User> findByUsername(String username);

	boolean existsByUsername(String username);
}
