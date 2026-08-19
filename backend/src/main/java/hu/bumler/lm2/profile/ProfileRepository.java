package hu.bumler.lm2.profile;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ProfileRepository extends JpaRepository<ProfileEntity, UUID> {

	Optional<ProfileEntity> findByUserId(UUID userId);
}
