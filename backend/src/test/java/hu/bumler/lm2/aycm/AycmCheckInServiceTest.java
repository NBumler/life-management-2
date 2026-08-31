package hu.bumler.lm2.aycm;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.AycmCheckIn;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;
import hu.bumler.lm2.common.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class AycmCheckInServiceTest {

	private AycmCheckInRepository repository;
	private AycmCheckInService service;

	@BeforeEach
	void setUp() {
		repository = mock(AycmCheckInRepository.class);
		service = new AycmCheckInService(repository, new AycmCheckInMapper());
		when(repository.findByUserIdAndCheckInDateAndDeletedFalse(any(), any())).thenReturn(Optional.empty());
	}

	private static AycmCheckIn dto(UUID id) {
		AycmCheckIn checkIn = new AycmCheckIn(id, LocalDate.parse("2026-08-31"), "18:30", UUID.randomUUID(), "Life1",
				"08:00–20:00", 3200, 0, 3200, false);
		return checkIn;
	}

	private static AycmCheckInEntity entity(UUID id, UUID userId) {
		AycmCheckInEntity entity = new AycmCheckInEntity(id, userId);
		entity.setCheckInDate(LocalDate.parse("2026-08-30"));
		entity.setCheckInTime("10:00");
		entity.setPartnerId(UUID.randomUUID());
		entity.setPartnerName("Old");
		entity.setRuleLabel("");
		return entity;
	}

	@Test
	void create_insertsNewCheckIn_whenIdNotFound() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		AycmCheckIn saved = service.create(userId, dto(id));

		assertThat(saved.getVisitValueHuf()).isEqualTo(3200);
		assertThat(saved.getRuleLabel()).isEqualTo("08:00–20:00");
	}

	@Test
	void create_rejectsSecondLiveCheckInForSameDay_withConflictingId() {
		UUID userId = UUID.randomUUID();
		AycmCheckInEntity existing = entity(UUID.randomUUID(), userId);
		existing.setCheckInDate(LocalDate.parse("2026-08-31"));
		when(repository.findById(any())).thenReturn(Optional.empty());
		when(repository.findByUserIdAndCheckInDateAndDeletedFalse(userId, LocalDate.parse("2026-08-31")))
				.thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(userId, dto(UUID.randomUUID())))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> {
					assertThat(((UniqueViolationException) ex).getField()).isEqualTo("checkInDate");
					assertThat(((UniqueViolationException) ex).getConflictingId()).isEqualTo(existing.getId());
				});
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_rejectsMalformedTime() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		AycmCheckIn bad = dto(id);
		bad.setCheckInTime("24:00");

		assertThatThrownBy(() -> service.create(userId, bad)).isInstanceOf(ValidationException.class);
	}

	@Test
	void create_rejectsNegativeSnapshotAmount() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		AycmCheckIn bad = dto(id);
		bad.setVisitValueHuf(-1);

		assertThatThrownBy(() -> service.create(userId, bad)).isInstanceOf(ValidationException.class);
	}

	@Test
	void create_rejectsForeignRow_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		AycmCheckInEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId())))
				.isInstanceOf(EntityNotFoundException.class);
	}

	@Test
	void update_throwsEntityDeleted_whenAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		AycmCheckInEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId())))
				.isInstanceOf(EntityDeletedException.class);
	}

	@Test
	void update_reappliesSnapshot_andReMatchesNothingServerSide() {
		UUID userId = UUID.randomUUID();
		AycmCheckInEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		AycmCheckIn changed = dto(existing.getId());
		changed.ruleId(null);
		changed.setRuleLabel("—");
		changed.setListPriceHuf(0);
		changed.setVisitValueHuf(0);

		AycmCheckIn updated = service.update(userId, existing.getId(), changed);

		assertThat(updated.getVisitValueHuf()).isZero();
		assertThat(updated.getRuleLabel()).isEqualTo("—");
	}

	@Test
	void delete_softDeletes_thenIsIdempotent() {
		UUID userId = UUID.randomUUID();
		AycmCheckInEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		assertThat(service.delete(userId, existing.getId()).getDeleted()).isTrue();

		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		assertThat(service.delete(userId, existing.getId()).getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing); // only the first call persisted
	}

	@Test
	void list_usesRangeQuery_whenFromAndToGiven() {
		UUID userId = UUID.randomUUID();
		LocalDate from = LocalDate.parse("2026-08-01");
		LocalDate to = LocalDate.parse("2026-08-31");
		when(repository.findByUserIdAndDeletedFalseAndCheckInDateBetweenOrderByCheckInDateDescCheckInTimeDesc(userId,
				from, to)).thenReturn(List.of(entity(UUID.randomUUID(), userId)));

		assertThat(service.list(userId, from, to)).hasSize(1);
		verify(repository, never()).findByUserIdAndDeletedFalseOrderByCheckInDateDescCheckInTimeDesc(any());
	}

	@Test
	void list_usesPlainQuery_whenRangeMissing() {
		UUID userId = UUID.randomUUID();
		when(repository.findByUserIdAndDeletedFalseOrderByCheckInDateDescCheckInTimeDesc(userId))
				.thenReturn(List.of(entity(UUID.randomUUID(), userId), entity(UUID.randomUUID(), userId)));

		assertThat(service.list(userId, null, null)).hasSize(2);
	}
}
