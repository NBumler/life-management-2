package hu.bumler.lm2.aycm;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.AycmSettings;
import hu.bumler.lm2.common.DeterministicUuid;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class AycmSettingsServiceTest {

	private AycmSettingsRepository repository;
	private AycmSettingsService service;

	@BeforeEach
	void setUp() {
		repository = mock(AycmSettingsRepository.class);
		service = new AycmSettingsService(repository, new AycmSettingsMapper());
	}

	private static AycmSettingsEntity entity(UUID id, UUID userId) {
		return new AycmSettingsEntity(id, userId);
	}

	@Test
	void get_returnsLazyDefault_whenNoRow_withDeterministicIdAndNullLink() {
		UUID userId = UUID.randomUUID();
		when(repository.findByUserId(userId)).thenReturn(Optional.empty());

		AycmSettings dto = service.get(userId);

		assertThat(dto.getId()).isEqualTo(DeterministicUuid.v5("AycmSettings:" + userId));
		assertThat(dto.getLinkedRecurringExpenseId().isPresent()).isTrue();
		assertThat(dto.getLinkedRecurringExpenseId().get()).isNull();
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void get_returnsStoredRow_whenPresent() {
		UUID userId = UUID.randomUUID();
		UUID linked = UUID.randomUUID();
		AycmSettingsEntity row = entity(UUID.randomUUID(), userId);
		row.setLinkedRecurringExpenseId(linked);
		when(repository.findByUserId(userId)).thenReturn(Optional.of(row));

		assertThat(service.get(userId).getLinkedRecurringExpenseId().get()).isEqualTo(linked);
	}

	@Test
	void upsert_insertsNewRow_whenNoneYet() {
		UUID userId = UUID.randomUUID();
		UUID id = DeterministicUuid.v5("AycmSettings:" + userId);
		UUID linked = UUID.randomUUID();
		when(repository.findByUserId(userId)).thenReturn(Optional.empty());
		when(repository.existsById(id)).thenReturn(false);
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		AycmSettings body = new AycmSettings(id);
		body.linkedRecurringExpenseId(linked);
		AycmSettings saved = service.upsert(userId, body);

		assertThat(saved.getLinkedRecurringExpenseId().get()).isEqualTo(linked);
	}

	@Test
	void upsert_updatesExistingRow_scopedByUserId_ignoringBodyId() {
		UUID userId = UUID.randomUUID();
		AycmSettingsEntity row = entity(UUID.randomUUID(), userId);
		when(repository.findByUserId(userId)).thenReturn(Optional.of(row));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		UUID linked = UUID.randomUUID();
		AycmSettings body = new AycmSettings(UUID.randomUUID()); // stray body id
		body.linkedRecurringExpenseId(linked);
		AycmSettings saved = service.upsert(userId, body);

		assertThat(saved.getId()).isEqualTo(row.getId());
		assertThat(row.getLinkedRecurringExpenseId()).isEqualTo(linked);
	}

	@Test
	void upsert_clearsLink_whenNull() {
		UUID userId = UUID.randomUUID();
		AycmSettingsEntity row = entity(UUID.randomUUID(), userId);
		row.setLinkedRecurringExpenseId(UUID.randomUUID());
		when(repository.findByUserId(userId)).thenReturn(Optional.of(row));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		AycmSettings body = new AycmSettings(row.getId());
		body.linkedRecurringExpenseId(null);
		service.upsert(userId, body);

		assertThat(row.getLinkedRecurringExpenseId()).isNull();
	}

	@Test
	void upsert_refusesForeignId_whenIdBelongsToAnotherUsersRow() {
		UUID userId = UUID.randomUUID();
		UUID id = DeterministicUuid.v5("AycmSettings:" + userId);
		when(repository.findByUserId(userId)).thenReturn(Optional.empty());
		when(repository.existsById(id)).thenReturn(true);

		assertThatThrownBy(() -> service.upsert(userId, new AycmSettings(id)))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}
}
