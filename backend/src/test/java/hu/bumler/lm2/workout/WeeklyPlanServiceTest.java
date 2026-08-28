package hu.bumler.lm2.workout;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.WeeklyPlan;
import hu.bumler.lm2.api.model.WeeklyPlanSlot;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context. Tree-diff over a real DB is covered by WeeklyPlanIntegrationTest. */
class WeeklyPlanServiceTest {

	/** 2026-08-24 is a Monday. */
	private static final LocalDate WEEK_START = LocalDate.parse("2026-08-24");

	private WeeklyPlanRepository repository;
	private WeeklyPlanSlotRepository slotRepository;
	private WeeklyPlanService service;

	@BeforeEach
	void setUp() {
		repository = mock(WeeklyPlanRepository.class);
		slotRepository = mock(WeeklyPlanSlotRepository.class);
		service = new WeeklyPlanService(repository, slotRepository, new WeeklyPlanMapper(), new WeeklyPlanSlotMapper());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		when(slotRepository.findByWeeklyPlanIdIn(any())).thenReturn(List.of());
	}

	private static WeeklyPlanEntity weeklyPlanEntity(UUID id, UUID userId) {
		WeeklyPlanEntity entity = new WeeklyPlanEntity(id, userId);
		entity.setWeekStartDate(WEEK_START);
		return entity;
	}

	private static WeeklyPlanSlotEntity slotEntity(UUID id, UUID weeklyPlanId) {
		WeeklyPlanSlotEntity entity = new WeeklyPlanSlotEntity(id, weeklyPlanId);
		entity.setDayOfWeek("MONDAY");
		entity.setPlanId(UUID.randomUUID());
		return entity;
	}

	private static WeeklyPlan weeklyPlan(UUID id, List<WeeklyPlanSlot> slots) {
		return new WeeklyPlan(id, WEEK_START, slots, false);
	}

	private static WeeklyPlanSlot slot(UUID id, UUID weeklyPlanId, WeeklyPlanSlot.DayOfWeekEnum day, UUID planId) {
		return new WeeklyPlanSlot(id, weeklyPlanId, day, planId, false);
	}

	// --- create ---

	@Test
	void create_insertsNewWeeklyPlan_withSlots() {
		UUID userId = UUID.randomUUID();
		UUID planId = UUID.randomUUID();
		UUID weeklyId = UUID.randomUUID();
		UUID slotId = UUID.randomUUID();
		when(repository.findById(weeklyId)).thenReturn(Optional.empty());
		when(slotRepository.findByWeeklyPlanId(weeklyId)).thenReturn(List.of());

		WeeklyPlan dto = weeklyPlan(weeklyId, List.of(slot(slotId, weeklyId, WeeklyPlanSlot.DayOfWeekEnum.MONDAY, planId)));
		WeeklyPlan saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(weeklyId);
		ArgumentCaptor<WeeklyPlanEntity> planCaptor = ArgumentCaptor.forClass(WeeklyPlanEntity.class);
		verify(repository).saveAndFlush(planCaptor.capture());
		assertThat(planCaptor.getValue().getUserId()).isEqualTo(userId);
		assertThat(planCaptor.getValue().getWeekStartDate()).isEqualTo(WEEK_START);

		ArgumentCaptor<WeeklyPlanSlotEntity> slotCaptor = ArgumentCaptor.forClass(WeeklyPlanSlotEntity.class);
		verify(slotRepository).save(slotCaptor.capture());
		assertThat(slotCaptor.getValue().getId()).isEqualTo(slotId);
		assertThat(slotCaptor.getValue().getPlanId()).isEqualTo(planId);
		assertThat(slotCaptor.getValue().getDayOfWeek()).isEqualTo("MONDAY");
	}

	@Test
	void create_rejectsForeignWeeklyPlan_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		WeeklyPlanEntity existing = weeklyPlanEntity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, weeklyPlan(existing.getId(), List.of())))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_revivesTombstonedWeeklyPlan_whenPostedAgainForTheSameWeek() {
		UUID userId = UUID.randomUUID();
		WeeklyPlanEntity existing = weeklyPlanEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));
		when(slotRepository.findByWeeklyPlanId(existing.getId())).thenReturn(List.of());

		WeeklyPlan revived = service.create(userId, weeklyPlan(existing.getId(), List.of()));

		assertThat(existing.isDeleted()).isFalse();
		assertThat(revived.getDeleted()).isFalse();
	}

	// --- update: slot diff ---

	@Test
	void update_addsSlot_andSoftDeletesAMissingSlot() {
		UUID userId = UUID.randomUUID();
		UUID weeklyId = UUID.randomUUID();
		WeeklyPlanEntity existing = weeklyPlanEntity(weeklyId, userId);
		UUID keptSlotId = UUID.randomUUID();
		UUID removedSlotId = UUID.randomUUID();
		WeeklyPlanSlotEntity kept = slotEntity(keptSlotId, weeklyId);
		WeeklyPlanSlotEntity removed = slotEntity(removedSlotId, weeklyId);
		removed.setDayOfWeek("TUESDAY");

		when(repository.findByIdAndUserId(weeklyId, userId)).thenReturn(Optional.of(existing));
		when(slotRepository.findByWeeklyPlanId(weeklyId)).thenReturn(List.of(kept, removed));

		UUID addedSlotId = UUID.randomUUID();
		WeeklyPlan dto = weeklyPlan(weeklyId, List.of(
				slot(keptSlotId, weeklyId, WeeklyPlanSlot.DayOfWeekEnum.MONDAY, UUID.randomUUID()),
				slot(addedSlotId, weeklyId, WeeklyPlanSlot.DayOfWeekEnum.THURSDAY, UUID.randomUUID())));
		service.update(userId, weeklyId, dto);

		assertThat(removed.isDeleted()).isTrue();
		ArgumentCaptor<WeeklyPlanSlotEntity> captor = ArgumentCaptor.forClass(WeeklyPlanSlotEntity.class);
		verify(slotRepository, times(3)).save(captor.capture());
		assertThat(captor.getAllValues()).anySatisfy(s -> assertThat(s.getId()).isEqualTo(addedSlotId));
	}

	@Test
	void update_revivesTombstonedSlot_whenItsIdReappearsInIncomingLiveList() {
		UUID userId = UUID.randomUUID();
		UUID weeklyId = UUID.randomUUID();
		WeeklyPlanEntity existing = weeklyPlanEntity(weeklyId, userId);
		WeeklyPlanSlotEntity tombstoned = slotEntity(UUID.randomUUID(), weeklyId);
		tombstoned.softDelete();

		when(repository.findByIdAndUserId(weeklyId, userId)).thenReturn(Optional.of(existing));
		when(slotRepository.findByWeeklyPlanId(weeklyId)).thenReturn(List.of(tombstoned));

		WeeklyPlan dto = weeklyPlan(weeklyId,
				List.of(slot(tombstoned.getId(), weeklyId, WeeklyPlanSlot.DayOfWeekEnum.MONDAY, UUID.randomUUID())));
		service.update(userId, weeklyId, dto);

		assertThat(tombstoned.isDeleted()).isFalse();
		verify(slotRepository).save(tombstoned);
	}

	@Test
	void update_throwsEntityDeleted_whenWeeklyPlanAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		WeeklyPlanEntity existing = weeklyPlanEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), weeklyPlan(existing.getId(), List.of())))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenWeeklyPlanBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, cascading, idempotent) ---

	@Test
	void delete_softDeletesWeeklyPlan_andCascadesToLiveSlots() {
		UUID userId = UUID.randomUUID();
		WeeklyPlanEntity existing = weeklyPlanEntity(UUID.randomUUID(), userId);
		WeeklyPlanSlotEntity slot = slotEntity(UUID.randomUUID(), existing.getId());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(slotRepository.findByWeeklyPlanIdAndDeletedFalse(existing.getId())).thenReturn(List.of(slot));
		when(slotRepository.findByWeeklyPlanId(existing.getId())).thenReturn(List.of(slot));

		WeeklyPlan deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		assertThat(slot.isDeleted()).isTrue();
		verify(slotRepository).save(slot);
	}

	@Test
	void delete_isIdempotent_whenWeeklyPlanAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		WeeklyPlanEntity existing = weeklyPlanEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(slotRepository.findByWeeklyPlanId(existing.getId())).thenReturn(List.of());

		WeeklyPlan deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
		verify(slotRepository, never()).findByWeeklyPlanIdAndDeletedFalse(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedWeeklyPlansForUser() {
		UUID userId = UUID.randomUUID();
		WeeklyPlanEntity w1 = weeklyPlanEntity(UUID.randomUUID(), userId);
		WeeklyPlanEntity w2 = weeklyPlanEntity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByWeekStartDateDesc(userId)).thenReturn(List.of(w1, w2));

		List<WeeklyPlan> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(WeeklyPlan::getId).containsExactly(w1.getId(), w2.getId());
	}
}
