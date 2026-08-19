package hu.bumler.lm2.profile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface WeightHistoryEntryRepository extends JpaRepository<WeightHistoryEntryEntity, UUID> {

	Optional<WeightHistoryEntryEntity> findByIdAndUserId(UUID id, UUID userId);

	List<WeightHistoryEntryEntity> findByUserIdAndDeletedFalseOrderByRecordedAtDesc(UUID userId);
}
