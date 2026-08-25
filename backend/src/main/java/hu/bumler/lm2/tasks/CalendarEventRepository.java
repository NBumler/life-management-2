package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface CalendarEventRepository extends JpaRepository<CalendarEventEntity, UUID> {

	List<CalendarEventEntity> findByUserIdAndDeletedFalseOrderByDateAsc(UUID userId);

	Optional<CalendarEventEntity> findByIdAndUserId(UUID id, UUID userId);
}
