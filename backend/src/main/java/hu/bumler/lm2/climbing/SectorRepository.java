package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface SectorRepository extends JpaRepository<SectorEntity, UUID> {

	List<SectorEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<SectorEntity> findByIdAndUserId(UUID id, UUID userId);
}
