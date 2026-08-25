package hu.bumler.lm2.tasks;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.CalendarEvent;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class CalendarEventServiceTest {

	private CalendarEventRepository repository;
	private CalendarEventService service;

	@BeforeEach
	void setUp() {
		repository = mock(CalendarEventRepository.class);
		service = new CalendarEventService(repository, new CalendarEventMapper());
	}

	private static CalendarEventEntity entity(UUID id, UUID userId) {
		CalendarEventEntity entity = new CalendarEventEntity(id, userId);
		entity.setTitle("Fogorvos");
		entity.setAllDay(false);
		entity.setDate(LocalDate.of(2026, 6, 1));
		entity.setStartTime("10:00");
		entity.setEndTime("11:00");
		entity.setInterval(1);
		return entity;
	}

	private static CalendarEvent timedDto(UUID id, String startTime, String endTime) {
		CalendarEvent dto = new CalendarEvent(id, "Fogorvos", false, LocalDate.of(2026, 6, 1), 1, false);
		dto.startTime(startTime);
		dto.endTime(endTime);
		return dto;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewEvent_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		CalendarEvent saved = service.create(userId, timedDto(id, "10:00", "11:00"));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getTitle()).isEqualTo("Fogorvos");
		assertThat(saved.getStartTime().orElse(null)).isEqualTo("10:00");
	}

	@Test
	void create_rejectsForeignEvent_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		CalendarEventEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, timedDto(existing.getId(), "10:00", "11:00")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_acceptsAllDay_withoutTimes() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		CalendarEvent dto = new CalendarEvent(id, "Szülinap", true, LocalDate.of(2026, 6, 1), 1, false);

		CalendarEvent saved = service.create(userId, dto);

		assertThat(saved.getAllDay()).isTrue();
		assertThat(saved.getStartTime().orElse(null)).isNull();
	}

	@Test
	void create_throwsValidation_whenAllDayButTimesGiven() {
		UUID userId = UUID.randomUUID();
		CalendarEvent dto = new CalendarEvent(UUID.randomUUID(), "Szülinap", true, LocalDate.of(2026, 6, 1), 1, false);
		dto.startTime("10:00");

		assertThatThrownBy(() -> service.create(userId, dto)).isInstanceOf(ValidationException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsValidation_whenTimedButMissingATime() {
		UUID userId = UUID.randomUUID();
		CalendarEvent dto = new CalendarEvent(UUID.randomUUID(), "Fogorvos", false, LocalDate.of(2026, 6, 1), 1, false);
		dto.startTime("10:00");

		assertThatThrownBy(() -> service.create(userId, dto)).isInstanceOf(ValidationException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsValidation_whenEndTimeNotAfterStartTime() {
		UUID userId = UUID.randomUUID();

		assertThatThrownBy(() -> service.create(userId, timedDto(UUID.randomUUID(), "11:00", "10:00")))
				.isInstanceOf(ValidationException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenEventBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- update ---

	@Test
	void update_throwsEntityDeleted_whenEventAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		CalendarEventEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), timedDto(existing.getId(), "10:00", "11:00")))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenEventNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		CalendarEventEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		CalendarEvent deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenEventAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		CalendarEventEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		CalendarEvent deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedEventsForUser() {
		UUID userId = UUID.randomUUID();
		CalendarEventEntity e1 = entity(UUID.randomUUID(), userId);
		CalendarEventEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByDateAsc(userId)).thenReturn(List.of(e1, e2));

		List<CalendarEvent> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(CalendarEvent::getId).containsExactly(e1.getId(), e2.getId());
	}
}
