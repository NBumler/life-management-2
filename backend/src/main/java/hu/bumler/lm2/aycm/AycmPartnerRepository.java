package hu.bumler.lm2.aycm;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface AycmPartnerRepository extends JpaRepository<AycmPartnerEntity, UUID> {

	List<AycmPartnerEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<AycmPartnerEntity> findByIdAndUserId(UUID id, UUID userId);

	Optional<AycmPartnerEntity> findByUserIdAndNameNormalizedAndDeletedFalse(UUID userId, String nameNormalized);
}
