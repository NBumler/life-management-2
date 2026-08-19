package hu.bumler.lm2.profile;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.WeightHistoryEntry;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class WeightHistoryServiceTest {

	private WeightHistoryEntryRepository repository;
	private WeightHistoryService service;

	@BeforeEach
	void setUp() {
		repository = mock(WeightHistoryEntryRepository.class);
		service = new WeightHistoryService(repository, new WeightHistoryEntryMapper());
	}

	private static WeightHistoryEntryEntity entity(UUID id, UUID userId) {
		return new WeightHistoryEntryEntity(id, userId, OffsetDateTime.now(), BigDecimal.valueOf(80.0));
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewEntry_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		WeightHistoryEntry dto = new WeightHistoryEntry(id, OffsetDateTime.now(), BigDecimal.valueOf(82.0), false);
		WeightHistoryEntry saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getWeightKg()).isEqualByComparingTo("82.0");

		ArgumentCaptor<WeightHistoryEntryEntity> captor = ArgumentCaptor.forClass(WeightHistoryEntryEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
	}

	@Test
	void create_updatesOwnExistingEntry_whenIdBelongsToCallingUser() {
		UUID userId = UUID.randomUUID();
		WeightHistoryEntryEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		WeightHistoryEntry dto = new WeightHistoryEntry(existing.getId(), OffsetDateTime.now(),
				BigDecimal.valueOf(77.7), false);
		WeightHistoryEntry saved = service.create(userId, dto);

		assertThat(saved.getWeightKg()).isEqualByComparingTo("77.7");
		ArgumentCaptor<WeightHistoryEntryEntity> captor = ArgumentCaptor.forClass(WeightHistoryEntryEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue()).isSameAs(existing);
	}

	@Test
	void create_rejectsForeignEntry_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		WeightHistoryEntryEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		WeightHistoryEntry dto = new WeightHistoryEntry(existing.getId(), OffsetDateTime.now(),
				BigDecimal.valueOf(60.0), false);

		assertThatThrownBy(() -> service.create(attacker, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_returnsEntry_whenOwnedByCallingUser() {
		UUID userId = UUID.randomUUID();
		WeightHistoryEntryEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThat(service.get(userId, existing.getId()).getId()).isEqualTo(existing.getId());
	}

	@Test
	void get_throwsNotFound_whenEntryBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		// findByIdAndUserId is scoped by user, so a foreign row simply isn't found.
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- update ---

	@Test
	void update_appliesNewFields_whenEntryIsNotDeleted() {
		UUID userId = UUID.randomUUID();
		WeightHistoryEntryEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		WeightHistoryEntry dto = new WeightHistoryEntry(existing.getId(), OffsetDateTime.now(),
				BigDecimal.valueOf(65.4), false);
		WeightHistoryEntry updated = service.update(userId, existing.getId(), dto);

		assertThat(updated.getWeightKg()).isEqualByComparingTo("65.4");
	}

	@Test
	void update_throwsEntityDeleted_whenEntryAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		WeightHistoryEntryEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		WeightHistoryEntry dto = new WeightHistoryEntry(existing.getId(), OffsetDateTime.now(),
				BigDecimal.valueOf(65.4), false);

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_throwsNotFound_whenEntryBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		WeightHistoryEntry dto = new WeightHistoryEntry(id, OffsetDateTime.now(), BigDecimal.valueOf(65.4), false);

		assertThatThrownBy(() -> service.update(attacker, id, dto)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenEntryNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		WeightHistoryEntryEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		WeightHistoryEntry deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenEntryAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		WeightHistoryEntryEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		WeightHistoryEntry deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		// No write happens on a no-op delete — nothing changed, so nothing needs persisting.
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void delete_throwsNotFound_whenEntryBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.delete(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- list ---

	@Test
	void list_returnsMappedEntriesForUser() {
		UUID userId = UUID.randomUUID();
		WeightHistoryEntryEntity e1 = entity(UUID.randomUUID(), userId);
		WeightHistoryEntryEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByRecordedAtDesc(userId)).thenReturn(List.of(e1, e2));

		List<WeightHistoryEntry> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(WeightHistoryEntry::getId).containsExactly(e1.getId(), e2.getId());
	}
}
