package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface CragRepository extends JpaRepository<CragEntity, UUID> {

	List<CragEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<CragEntity> findByIdAndUserId(UUID id, UUID userId);
}
