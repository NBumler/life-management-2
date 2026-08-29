package hu.bumler.lm2.climbing;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.GymColorBand;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class GymColorBandServiceTest {

	private GymColorBandRepository repository;
	private GymColorBandService service;

	@BeforeEach
	void setUp() {
		repository = mock(GymColorBandRepository.class);
		service = new GymColorBandService(repository, new GymColorBandMapper());
	}

	private static GymColorBand dto(UUID id, UUID gymId, String hex) {
		return new GymColorBand(id, gymId, "Piros", hex, GymColorBand.VariantEnum.NEUTRAL, "6A", "6B", 40, 44, false);
	}

	private static GymColorBandEntity entity(UUID id, UUID userId, UUID gymId, String canonicalHex) {
		GymColorBandEntity e = new GymColorBandEntity(id, userId, gymId);
		e.setName("Kék");
		e.setHexColor(canonicalHex);
		e.setVariant("NEUTRAL");
		e.setGradeLower("5C");
		e.setGradeUpper("6A");
		e.setAbsoluteDifficultyIndexLower(30);
		e.setAbsoluteDifficultyIndexUpper(38);
		return e;
	}

	@Test
	void create_storesCanonicalHex_whenClientSendsShortUppercaseForm() {
		UUID userId = UUID.randomUUID();
		UUID gymId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByGymIdAndHexColorAndDeletedFalse(any(), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		GymColorBand saved = service.create(userId, dto(id, gymId, "#F0A"));

		assertThat(saved.getHexColor()).isEqualTo("#ff00aa");
	}

	@Test
	void create_returnsUniqueViolationWithConflictingId_whenCanonicalHexAlreadyLiveForGym() {
		UUID userId = UUID.randomUUID();
		UUID gymId = UUID.randomUUID();
		GymColorBandEntity live = entity(UUID.randomUUID(), userId, gymId, "#ff00aa");
		UUID newId = UUID.randomUUID();
		when(repository.findById(newId)).thenReturn(Optional.empty());
		when(repository.findByGymIdAndHexColorAndDeletedFalse(eq(gymId), eq("#ff00aa"))).thenReturn(Optional.of(live));

		assertThatThrownBy(() -> service.create(userId, dto(newId, gymId, "FF00AA")))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> {
					UniqueViolationException uve = (UniqueViolationException) ex;
					assertThat(uve.getField()).isEqualTo("hexColor");
					assertThat(uve.getConflictingId()).isEqualTo(live.getId());
				});
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_allowsSameHexForADifferentGym() {
		UUID userId = UUID.randomUUID();
		UUID otherGymId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByGymIdAndHexColorAndDeletedFalse(eq(otherGymId), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		GymColorBand saved = service.create(userId, dto(id, otherGymId, "#ff00aa"));

		assertThat(saved.getHexColor()).isEqualTo("#ff00aa");
	}

	@Test
	void create_rejectsForeignBand_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		GymColorBandEntity existing = entity(UUID.randomUUID(), owner, UUID.randomUUID(), "#123456");
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(
				() -> service.create(attacker, dto(existing.getId(), existing.getGymId(), "#654321")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_throwsEntityDeleted_whenBandAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		GymColorBandEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID(), "#123456");
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(),
				dto(existing.getId(), existing.getGymId(), "#abcdef")))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void delete_softDeletes_thenIsIdempotent() {
		UUID userId = UUID.randomUUID();
		GymColorBandEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID(), "#123456");
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		assertThat(service.delete(userId, existing.getId()).getDeleted()).isTrue();
		service.delete(userId, existing.getId());
		verify(repository).saveAndFlush(existing); // only once
	}
}
