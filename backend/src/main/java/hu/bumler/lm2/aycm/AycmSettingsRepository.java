package hu.bumler.lm2.aycm;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface AycmSettingsRepository extends JpaRepository<AycmSettingsEntity, UUID> {

	Optional<AycmSettingsEntity> findByUserId(UUID userId);
}
