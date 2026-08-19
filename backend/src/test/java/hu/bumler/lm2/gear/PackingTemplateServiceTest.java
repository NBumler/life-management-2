package hu.bumler.lm2.gear;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.PackingTemplate;
import hu.bumler.lm2.api.model.PackingTemplateDetail;
import hu.bumler.lm2.api.model.PackingTemplateItem;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class PackingTemplateServiceTest {

	private PackingTemplateRepository repository;
	private PackingTemplateItemRepository itemRepository;
	private PackingTemplateService service;

	@BeforeEach
	void setUp() {
		repository = mock(PackingTemplateRepository.class);
		itemRepository = mock(PackingTemplateItemRepository.class);
		service = new PackingTemplateService(repository, itemRepository, new PackingTemplateMapper(), new PackingTemplateItemMapper());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	private static PackingTemplateEntity template(UUID id, UUID userId) {
		PackingTemplateEntity entity = new PackingTemplateEntity(id, userId);
		entity.rename("Hétvégi mászás", "hétvégi mászás");
		return entity;
	}

	private static PackingTemplateItemEntity item(UUID id, UUID userId, UUID templateId, UUID gearItemId, int sortOrder) {
		return new PackingTemplateItemEntity(id, userId, templateId, gearItemId, sortOrder);
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewTemplate_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(eq(userId), any())).thenReturn(Optional.empty());
		when(itemRepository.findByTemplateId(id)).thenReturn(List.of());

		PackingTemplateDetail dto = new PackingTemplateDetail(id, "Tél", false, List.of());
		PackingTemplateDetail saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getName()).isEqualTo("Tél");
		ArgumentCaptor<PackingTemplateEntity> captor = ArgumentCaptor.forClass(PackingTemplateEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
	}

	@Test
	void create_rejectsForeignTemplate_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		PackingTemplateEntity existing = template(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		PackingTemplateDetail dto = new PackingTemplateDetail(existing.getId(), "Tél", false, List.of());

		assertThatThrownBy(() -> service.create(attacker, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsUniqueViolationWithConflictingId_whenNameAlreadyLiveForUser() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		PackingTemplateEntity conflict = template(UUID.randomUUID(), userId);
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, "hétvégi mászás")).thenReturn(Optional.of(conflict));

		PackingTemplateDetail dto = new PackingTemplateDetail(id, "Hétvégi mászás", false, List.of());

		assertThatThrownBy(() -> service.create(userId, dto))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> {
					UniqueViolationException uve = (UniqueViolationException) ex;
					assertThat(uve.getField()).isEqualTo("name");
					assertThat(uve.getConflictingId()).isEqualTo(conflict.getId());
				});
		verify(repository, never()).saveAndFlush(any());
	}

	// --- update: item diff (add / keep+reorder / remove) ---

	@Test
	void update_addsNewItems_reordersKeptItems_andSoftDeletesMissingItems() {
		UUID userId = UUID.randomUUID();
		UUID templateId = UUID.randomUUID();
		PackingTemplateEntity existing = template(templateId, userId);
		UUID keptItemId = UUID.randomUUID();
		UUID removedItemId = UUID.randomUUID();
		UUID keptGearId = UUID.randomUUID();
		UUID removedGearId = UUID.randomUUID();
		UUID newGearId = UUID.randomUUID();
		PackingTemplateItemEntity kept = item(keptItemId, userId, templateId, keptGearId, 0);
		PackingTemplateItemEntity removed = item(removedItemId, userId, templateId, removedGearId, 1);

		when(repository.findByIdAndUserId(templateId, userId)).thenReturn(Optional.of(existing));
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(eq(userId), any())).thenReturn(Optional.empty());
		when(itemRepository.findByTemplateId(templateId)).thenReturn(List.of(kept, removed));

		UUID newItemId = UUID.randomUUID();
		PackingTemplateItem keptDto = new PackingTemplateItem(keptItemId, templateId, keptGearId, 1, false); // reordered to index 1
		PackingTemplateItem newDto = new PackingTemplateItem(newItemId, templateId, newGearId, 0, false); // new item, index 0
		PackingTemplateDetail dto = new PackingTemplateDetail(templateId, "Hétvégi mászás", false, List.of(newDto, keptDto));

		service.update(userId, templateId, dto);

		ArgumentCaptor<PackingTemplateItemEntity> captor = ArgumentCaptor.forClass(PackingTemplateItemEntity.class);
		verify(itemRepository, times(3)).save(captor.capture());
		List<PackingTemplateItemEntity> saved = captor.getAllValues();

		// The kept item is updated in place (same entity instance), reordered.
		assertThat(kept.getSortOrder()).isEqualTo(1);
		assertThat(saved).contains(kept);
		// A brand-new item entity was created and saved for the new gear reference.
		assertThat(saved).anySatisfy(e -> {
			assertThat(e.getId()).isEqualTo(newItemId);
			assertThat(e.getGearItemId()).isEqualTo(newGearId);
			assertThat(e.getSortOrder()).isEqualTo(0);
		});
		// The item missing from the incoming list is soft-deleted, not hard-removed.
		assertThat(removed.isDeleted()).isTrue();
		assertThat(saved).contains(removed);
	}

	@Test
	void update_throwsEntityDeleted_whenTemplateAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		PackingTemplateEntity existing = template(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		PackingTemplateDetail dto = new PackingTemplateDetail(existing.getId(), "Hétvégi mászás", false, List.of());

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto)).isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_throwsNotFound_whenTemplateBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		PackingTemplateDetail dto = new PackingTemplateDetail(id, "Tél", false, List.of());

		assertThatThrownBy(() -> service.update(attacker, id, dto)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenTemplateBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, cascading, idempotent) ---

	@Test
	void delete_softDeletesTemplateAndCascadesToLiveItems() {
		UUID userId = UUID.randomUUID();
		PackingTemplateEntity existing = template(UUID.randomUUID(), userId);
		PackingTemplateItemEntity liveItem = item(UUID.randomUUID(), userId, existing.getId(), UUID.randomUUID(), 0);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByTemplateIdAndDeletedFalse(existing.getId())).thenReturn(List.of(liveItem));
		when(itemRepository.findByTemplateId(existing.getId())).thenReturn(List.of(liveItem));

		PackingTemplateDetail deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		assertThat(liveItem.isDeleted()).isTrue();
		verify(itemRepository).save(liveItem);
	}

	@Test
	void delete_isIdempotent_whenTemplateAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		PackingTemplateEntity existing = template(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(itemRepository.findByTemplateId(existing.getId())).thenReturn(List.of());

		PackingTemplateDetail deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
		verify(itemRepository, never()).findByTemplateIdAndDeletedFalse(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedTemplatesForUser() {
		UUID userId = UUID.randomUUID();
		PackingTemplateEntity t1 = template(UUID.randomUUID(), userId);
		PackingTemplateEntity t2 = template(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId)).thenReturn(List.of(t1, t2));

		List<PackingTemplate> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(PackingTemplate::getId).containsExactly(t1.getId(), t2.getId());
	}
}
