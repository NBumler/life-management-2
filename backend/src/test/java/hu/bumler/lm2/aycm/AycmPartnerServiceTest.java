package hu.bumler.lm2.aycm;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.AycmPartner;
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
class AycmPartnerServiceTest {

	private AycmPartnerRepository repository;
	private AycmPriceRuleRepository priceRuleRepository;
	private AycmPartnerService service;

	@BeforeEach
	void setUp() {
		repository = mock(AycmPartnerRepository.class);
		priceRuleRepository = mock(AycmPriceRuleRepository.class);
		service = new AycmPartnerService(repository, priceRuleRepository, new AycmPartnerMapper());
	}

	private static AycmPartner dto(UUID id) {
		AycmPartner partner = new AycmPartner(id, "Life1 Kondi", false);
		partner.notes("belváros");
		return partner;
	}

	private static AycmPartnerEntity entity(UUID id, UUID userId, String name) {
		AycmPartnerEntity entity = new AycmPartnerEntity(id, userId);
		entity.rename(name, name.toLowerCase());
		return entity;
	}

	@Test
	void create_insertsNewPartner_whenIdNotFound() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(any(), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		AycmPartner saved = service.create(userId, dto(id));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getName()).isEqualTo("Life1 Kondi");
		assertThat(saved.getNotes().orElse(null)).isEqualTo("belváros");
	}

	@Test
	void create_trimsName_andRejectsBlank() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(any(), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		AycmPartner padded = dto(id);
		padded.setName("  Gym  ");
		assertThat(service.create(userId, padded).getName()).isEqualTo("Gym");

		AycmPartner blank = dto(id);
		blank.setName("   ");
		assertThatThrownBy(() -> service.create(userId, blank)).isInstanceOf(ValidationException.class);
	}

	@Test
	void create_rejectsDuplicateLiveName_withConflictingId() {
		UUID userId = UUID.randomUUID();
		UUID newId = UUID.randomUUID();
		AycmPartnerEntity existing = entity(UUID.randomUUID(), userId, "life1 kondi");
		when(repository.findById(newId)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, "life1 kondi"))
				.thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(userId, dto(newId)))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> assertThat(((UniqueViolationException) ex).getConflictingId()).isEqualTo(existing.getId()));
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_rejectsForeignPartner_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		AycmPartnerEntity existing = entity(UUID.randomUUID(), owner, "gym");
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId())))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_throwsEntityDeleted_whenAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		AycmPartnerEntity existing = entity(UUID.randomUUID(), userId, "gym");
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId())))
				.isInstanceOf(EntityDeletedException.class);
	}

	@Test
	void delete_softDeletesPartner_andCascadesToLiveRules() {
		UUID userId = UUID.randomUUID();
		AycmPartnerEntity existing = entity(UUID.randomUUID(), userId, "gym");
		AycmPriceRuleEntity rule = new AycmPriceRuleEntity(UUID.randomUUID(), userId, existing.getId());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		when(priceRuleRepository.findByPartnerIdAndUserIdAndDeletedFalseOrderByStartTimeAsc(existing.getId(), userId))
				.thenReturn(List.of(rule));

		AycmPartner deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		assertThat(rule.isDeleted()).isTrue();
		verify(priceRuleRepository).save(rule);
	}

	@Test
	void delete_isIdempotent_whenAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		AycmPartnerEntity existing = entity(UUID.randomUUID(), userId, "gym");
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThat(service.delete(userId, existing.getId()).getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
		verify(priceRuleRepository, never()).save(any());
	}

	@Test
	void list_returnsMappedPartnersForUser() {
		UUID userId = UUID.randomUUID();
		AycmPartnerEntity a = entity(UUID.randomUUID(), userId, "a-gym");
		AycmPartnerEntity b = entity(UUID.randomUUID(), userId, "b-gym");
		when(repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId)).thenReturn(List.of(a, b));

		List<AycmPartner> result = service.list(userId);

		assertThat(result).extracting(AycmPartner::getId).containsExactly(a.getId(), b.getId());
	}
}
