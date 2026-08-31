package hu.bumler.lm2.aycm;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface AycmPriceRuleRepository extends JpaRepository<AycmPriceRuleEntity, UUID> {

	List<AycmPriceRuleEntity> findByPartnerIdAndUserIdAndDeletedFalseOrderByStartTimeAsc(UUID partnerId, UUID userId);

	Optional<AycmPriceRuleEntity> findByIdAndUserId(UUID id, UUID userId);
}
