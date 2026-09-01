package hu.bumler.lm2.aycm;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.AycmPriceRule;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class AycmPriceRuleServiceTest {

	private AycmPriceRuleRepository repository;
	private AycmPartnerRepository partnerRepository;
	private AycmPriceRuleService service;
	private UUID userId;
	private UUID partnerId;

	@BeforeEach
	void setUp() {
		repository = mock(AycmPriceRuleRepository.class);
		partnerRepository = mock(AycmPartnerRepository.class);
		service = new AycmPriceRuleService(repository, partnerRepository, new AycmPriceRuleMapper());
		userId = UUID.randomUUID();
		partnerId = UUID.randomUUID();
		AycmPartnerEntity partner = new AycmPartnerEntity(partnerId, userId);
		partner.rename("Gym", "gym");
		when(partnerRepository.findByIdAndUserId(partnerId, userId)).thenReturn(Optional.of(partner));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	private AycmPriceRule dto(UUID id, boolean[] days, String start, String end) {
		return new AycmPriceRule(id, partnerId, days[0], days[1], days[2], days[3], days[4], days[5], days[6], start, end,
				2500, 0, false);
	}

	private static boolean[] weekdays() {
		return new boolean[] { true, true, true, true, true, false, false };
	}

	private AycmPriceRuleEntity liveRule(String start, String end, boolean[] days) {
		AycmPriceRuleEntity e = new AycmPriceRuleEntity(UUID.randomUUID(), userId, partnerId);
		e.setStartTime(start);
		e.setEndTime(end);
		e.setAppliesMon(days[0]);
		e.setAppliesTue(days[1]);
		e.setAppliesWed(days[2]);
		e.setAppliesThu(days[3]);
		e.setAppliesFri(days[4]);
		e.setAppliesSat(days[5]);
		e.setAppliesSun(days[6]);
		e.setListPriceHuf(1000);
		return e;
	}

	@Test
	void create_persistsRule_whenNoOverlap() {
		when(repository.findById(any())).thenReturn(Optional.empty());
		when(repository.findByPartnerIdAndUserIdAndDeletedFalseOrderByStartTimeAsc(partnerId, userId))
				.thenReturn(List.of());

		AycmPriceRule saved = service.create(userId, partnerId, dto(UUID.randomUUID(), weekdays(), "08:00", "12:00"));

		assertThat(saved.getStartTime()).isEqualTo("08:00");
		assertThat(saved.getEndTime()).isEqualTo("12:00");
	}

	@Test
	void create_rejectsRuleWithNoWeekdayFlag() {
		when(repository.findById(any())).thenReturn(Optional.empty());
		boolean[] none = new boolean[7];

		assertThatThrownBy(() -> service.create(userId, partnerId, dto(UUID.randomUUID(), none, "08:00", "12:00")))
				.isInstanceOf(ValidationException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_rejectsEndNotAfterStart() {
		when(repository.findById(any())).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.create(userId, partnerId, dto(UUID.randomUUID(), weekdays(), "12:00", "12:00")))
				.isInstanceOf(ValidationException.class);
	}

	@Test
	void create_acceptsEndOfDay_2400() {
		when(repository.findById(any())).thenReturn(Optional.empty());
		when(repository.findByPartnerIdAndUserIdAndDeletedFalseOrderByStartTimeAsc(partnerId, userId))
				.thenReturn(List.of());

		AycmPriceRule saved = service.create(userId, partnerId, dto(UUID.randomUUID(), weekdays(), "20:00", "24:00"));

		assertThat(saved.getEndTime()).isEqualTo("24:00");
	}

	@Test
	void create_rejectsOverlappingRule_onSharedWeekday() {
		when(repository.findById(any())).thenReturn(Optional.empty());
		when(repository.findByPartnerIdAndUserIdAndDeletedFalseOrderByStartTimeAsc(partnerId, userId))
				.thenReturn(List.of(liveRule("08:00", "12:00", weekdays())));

		assertThatThrownBy(() -> service.create(userId, partnerId, dto(UUID.randomUUID(), weekdays(), "11:00", "14:00")))
				.isInstanceOf(ValidationException.class);
	}

	@Test
	void create_allowsAdjacentRule_endEqualsStart() {
		when(repository.findById(any())).thenReturn(Optional.empty());
		when(repository.findByPartnerIdAndUserIdAndDeletedFalseOrderByStartTimeAsc(partnerId, userId))
				.thenReturn(List.of(liveRule("08:00", "12:00", weekdays())));

		assertThatCode(() -> service.create(userId, partnerId, dto(UUID.randomUUID(), weekdays(), "12:00", "16:00")))
				.doesNotThrowAnyException();
	}

	@Test
	void create_allowsSameInterval_onDisjointWeekday() {
		when(repository.findById(any())).thenReturn(Optional.empty());
		boolean[] weekend = new boolean[] { false, false, false, false, false, true, true };
		when(repository.findByPartnerIdAndUserIdAndDeletedFalseOrderByStartTimeAsc(partnerId, userId))
				.thenReturn(List.of(liveRule("08:00", "12:00", weekdays())));

		assertThatCode(() -> service.create(userId, partnerId, dto(UUID.randomUUID(), weekend, "08:00", "12:00")))
				.doesNotThrowAnyException();
	}

	@Test
	void list_throwsNotFound_whenPartnerMissing() {
		UUID otherPartner = UUID.randomUUID();
		when(partnerRepository.findByIdAndUserId(otherPartner, userId)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.list(userId, otherPartner)).isInstanceOf(EntityNotFoundException.class);
	}

	@Test
	void delete_isIdempotent_whenAlreadyDeleted() {
		AycmPriceRuleEntity rule = liveRule("08:00", "12:00", weekdays());
		rule.softDelete();
		when(repository.findByIdAndUserId(rule.getId(), userId)).thenReturn(Optional.of(rule));

		assertThat(service.delete(userId, partnerId, rule.getId()).getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void get_returnsRule_whenItLivesUnderThePathPartner() {
		AycmPriceRuleEntity rule = liveRule("08:00", "12:00", weekdays());
		when(repository.findByIdAndUserId(rule.getId(), userId)).thenReturn(Optional.of(rule));

		assertThat(service.get(userId, partnerId, rule.getId()).getStartTime()).isEqualTo("08:00");
	}

	@Test
	void get_throwsNotFound_whenRuleBelongsToAnotherPartner() {
		AycmPriceRuleEntity rule = new AycmPriceRuleEntity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(rule.getId(), userId)).thenReturn(Optional.of(rule));

		assertThatThrownBy(() -> service.get(userId, partnerId, rule.getId()))
				.isInstanceOf(EntityNotFoundException.class);
	}

	@Test
	void update_throwsNotFound_whenRuleBelongsToAnotherPartner() {
		AycmPriceRuleEntity rule = new AycmPriceRuleEntity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(rule.getId(), userId)).thenReturn(Optional.of(rule));

		assertThatThrownBy(
				() -> service.update(userId, partnerId, rule.getId(), dto(rule.getId(), weekdays(), "08:00", "12:00")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void delete_throwsNotFound_whenRuleBelongsToAnotherPartner() {
		AycmPriceRuleEntity rule = new AycmPriceRuleEntity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(rule.getId(), userId)).thenReturn(Optional.of(rule));

		assertThatThrownBy(() -> service.delete(userId, partnerId, rule.getId()))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsNotFound_whenExistingRuleBelongsToAnotherPartner() {
		AycmPriceRuleEntity rule = new AycmPriceRuleEntity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findById(rule.getId())).thenReturn(Optional.of(rule));

		assertThatThrownBy(
				() -> service.create(userId, partnerId, dto(rule.getId(), weekdays(), "08:00", "12:00")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}
}
