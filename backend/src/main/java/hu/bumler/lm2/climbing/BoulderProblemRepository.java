package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface BoulderProblemRepository extends JpaRepository<BoulderProblemEntity, UUID> {

	List<BoulderProblemEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<BoulderProblemEntity> findByIdAndUserId(UUID id, UUID userId);
}
