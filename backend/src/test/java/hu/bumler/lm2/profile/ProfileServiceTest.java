package hu.bumler.lm2.profile;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.UserProfile;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). Uses the real
 * {@link ProfileMapper} (no external dependencies of its own) so assertions exercise the actual
 * DTO <-> entity mapping, and mocks only the repository collaborator.
 */
class ProfileServiceTest {

	private ProfileRepository repository;
	private ProfileService service;

	@BeforeEach
	void setUp() {
		repository = mock(ProfileRepository.class);
		service = new ProfileService(repository, new ProfileMapper());
	}

	@Test
	void get_returnsMappedProfile_whenOneExistsForUser() {
		UUID userId = UUID.randomUUID();
		ProfileEntity entity = new ProfileEntity(UUID.randomUUID(), userId);
		entity.setCurrentWeightKg(BigDecimal.valueOf(80.0));
		when(repository.findByUserId(userId)).thenReturn(Optional.of(entity));

		UserProfile dto = service.get(userId);

		assertThat(dto.getId()).isEqualTo(entity.getId());
		assertThat(dto.getCurrentWeightKg().orElse(null)).isEqualByComparingTo("80.0");
	}

	@Test
	void get_throwsNotFound_whenNoProfileSavedYet() {
		UUID userId = UUID.randomUUID();
		when(repository.findByUserId(userId)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(userId)).isInstanceOf(EntityNotFoundException.class);
	}

	@Test
	void upsert_createsNewProfile_whenNoneExistsForUserAndIdIsFree() {
		UUID userId = UUID.randomUUID();
		UUID profileId = UUID.randomUUID();
		when(repository.findByUserId(userId)).thenReturn(Optional.empty());
		when(repository.existsById(profileId)).thenReturn(false);
		when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

		UserProfile dto = new UserProfile(profileId).goal(UserProfile.GoalEnum.MAINTENANCE)
				.currentWeightKg(BigDecimal.valueOf(75.0));
		UserProfile saved = service.upsert(userId, dto);

		assertThat(saved.getId()).isEqualTo(profileId);
		assertThat(saved.getCurrentWeightKg().orElse(null)).isEqualByComparingTo("75.0");

		ArgumentCaptor<ProfileEntity> captor = ArgumentCaptor.forClass(ProfileEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
		assertThat(captor.getValue().getId()).isEqualTo(profileId);
	}

	@Test
	void upsert_updatesExistingProfile_whenOneAlreadyExistsForUser() {
		UUID userId = UUID.randomUUID();
		ProfileEntity existing = new ProfileEntity(UUID.randomUUID(), userId);
		existing.setCurrentWeightKg(BigDecimal.valueOf(90.0));
		when(repository.findByUserId(userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

		// Client resends the profile id it already knows, with an updated weight.
		UserProfile dto = new UserProfile(existing.getId()).goal(UserProfile.GoalEnum.MAINTENANCE)
				.currentWeightKg(BigDecimal.valueOf(88.5));
		UserProfile saved = service.upsert(userId, dto);

		assertThat(saved.getId()).isEqualTo(existing.getId());
		assertThat(saved.getCurrentWeightKg().orElse(null)).isEqualByComparingTo("88.5");
		verify(repository, never()).existsById(any());

		ArgumentCaptor<ProfileEntity> captor = ArgumentCaptor.forClass(ProfileEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue()).isSameAs(existing);
	}

	@Test
	void upsert_rejectsForeignId_whenIdBelongsToAnotherUsersProfile() {
		UUID userId = UUID.randomUUID();
		UUID foreignProfileId = UUID.randomUUID();
		when(repository.findByUserId(userId)).thenReturn(Optional.empty());
		when(repository.existsById(foreignProfileId)).thenReturn(true);

		UserProfile dto = new UserProfile(foreignProfileId).goal(UserProfile.GoalEnum.MAINTENANCE);

		assertThatThrownBy(() -> service.upsert(userId, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void upsert_throwsValidationException_whenGoalIsFatLossWithoutKgPerWeek() {
		UUID userId = UUID.randomUUID();
		UserProfile dto = new UserProfile(UUID.randomUUID()).goal(UserProfile.GoalEnum.FAT_LOSS);

		assertThatThrownBy(() -> service.upsert(userId, dto)).isInstanceOf(ValidationException.class)
				.satisfies(ex -> assertThat(((ValidationException) ex).getField()).isEqualTo("kgPerWeek"));
		verifyNoInteractions(repository);
	}

	@Test
	void upsert_throwsValidationException_whenGoalIsWeightGainWithoutKgPerWeek() {
		UUID userId = UUID.randomUUID();
		UserProfile dto = new UserProfile(UUID.randomUUID()).goal(UserProfile.GoalEnum.WEIGHT_GAIN);

		assertThatThrownBy(() -> service.upsert(userId, dto)).isInstanceOf(ValidationException.class)
				.satisfies(ex -> assertThat(((ValidationException) ex).getField()).isEqualTo("kgPerWeek"));
		verifyNoInteractions(repository);
	}

	@Test
	void upsert_doesNotRequireKgPerWeek_whenGoalIsMaintenance() {
		UUID userId = UUID.randomUUID();
		UUID profileId = UUID.randomUUID();
		when(repository.findByUserId(userId)).thenReturn(Optional.empty());
		when(repository.existsById(profileId)).thenReturn(false);
		when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

		UserProfile dto = new UserProfile(profileId).goal(UserProfile.GoalEnum.MAINTENANCE);

		assertThat(service.upsert(userId, dto).getGoal().orElse(null)).isEqualTo(UserProfile.GoalEnum.MAINTENANCE);
	}

	@Test
	void upsert_doesNotRequireKgPerWeek_whenGoalIsAbsent() {
		UUID userId = UUID.randomUUID();
		UUID profileId = UUID.randomUUID();
		when(repository.findByUserId(userId)).thenReturn(Optional.empty());
		when(repository.existsById(profileId)).thenReturn(false);
		when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

		UserProfile dto = new UserProfile(profileId).currentWeightKg(BigDecimal.valueOf(70));

		assertThat(service.upsert(userId, dto).getGoal().orElse(null)).isNull();
	}

	@Test
	void upsert_succeeds_whenGoalIsFatLossAndKgPerWeekIsPresent() {
		UUID userId = UUID.randomUUID();
		UUID profileId = UUID.randomUUID();
		when(repository.findByUserId(userId)).thenReturn(Optional.empty());
		when(repository.existsById(profileId)).thenReturn(false);
		when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

		UserProfile dto = new UserProfile(profileId).goal(UserProfile.GoalEnum.FAT_LOSS)
				.kgPerWeek(BigDecimal.valueOf(0.5));

		UserProfile saved = service.upsert(userId, dto);
		assertThat(saved.getKgPerWeek().orElse(null)).isEqualByComparingTo("0.5");
	}

	@Test
	void upsert_usesSaveAndFlush_notSave_soTriggerGeneratedTimestampsComeBackImmediately() {
		// Regression guard: saveAndFlush (not save) is required for the DB trigger's updated_at to
		// be readable immediately (documentation comment in ProfileService).
		UUID userId = UUID.randomUUID();
		UUID profileId = UUID.randomUUID();
		when(repository.findByUserId(userId)).thenReturn(Optional.empty());
		when(repository.existsById(profileId)).thenReturn(false);
		when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

		service.upsert(userId, new UserProfile(profileId).goal(UserProfile.GoalEnum.MAINTENANCE));

		verify(repository).saveAndFlush(any());
		verify(repository, never()).save(any());
	}
}
