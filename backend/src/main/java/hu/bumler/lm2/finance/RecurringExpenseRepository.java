package hu.bumler.lm2.finance;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface RecurringExpenseRepository extends JpaRepository<RecurringExpenseEntity, UUID> {

	List<RecurringExpenseEntity> findByUserIdAndDeletedFalseOrderByNextBillingDateAscNameAsc(UUID userId);

	Optional<RecurringExpenseEntity> findByIdAndUserId(UUID id, UUID userId);
}
