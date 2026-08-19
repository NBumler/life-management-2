package hu.bumler.lm2.gear;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface PackingTemplateRepository extends JpaRepository<PackingTemplateEntity, UUID> {

	List<PackingTemplateEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<PackingTemplateEntity> findByIdAndUserId(UUID id, UUID userId);

	/** documentation/Architektúra/Névegyediség.md — live-row scope for the uniqueness pre-check. */
	Optional<PackingTemplateEntity> findByUserIdAndNameNormalizedAndDeletedFalse(UUID userId, String nameNormalized);
}
