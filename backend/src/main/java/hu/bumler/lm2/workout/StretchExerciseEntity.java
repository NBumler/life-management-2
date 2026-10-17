package hu.bumler.lm2.workout;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** documentation/Subfeatures/Gyakorlat.md "Entitás — StretchExercise" (backlog/167) — user-owned stretching exercise. */
@Entity
@Table(name = "stretch_exercise")
public class StretchExerciseEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private String name;

	@Column(name = "name_normalized", nullable = false)
	private String nameNormalized;

	@Column(nullable = false)
	private String category;

	@Column
	private String description;

	@Column
	private String equipment;

	@Column(name = "is_favorite", nullable = false)
	private boolean favorite = false;

	@Column(name = "default_hold_seconds", nullable = false)
	private int defaultHoldSeconds = 30;

	@Column(name = "default_per_side", nullable = false)
	private boolean defaultPerSide = false;

	@Generated(event = EventType.INSERT)
	@Column(name = "created_at", insertable = false, updatable = false)
	private OffsetDateTime createdAt;

	@Generated(event = { EventType.INSERT, EventType.UPDATE })
	@Column(name = "updated_at", insertable = false, updatable = false)
	private OffsetDateTime updatedAt;

	@Column(nullable = false)
	private boolean deleted = false;

	@Column(name = "deleted_at")
	private OffsetDateTime deletedAt;

	protected StretchExerciseEntity() {
	}

	public StretchExerciseEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public String getName() {
		return name;
	}

	public String getNameNormalized() {
		return nameNormalized;
	}

	public String getCategory() {
		return category;
	}

	public String getDescription() {
		return description;
	}

	public String getEquipment() {
		return equipment;
	}

	public boolean isFavorite() {
		return favorite;
	}

	public int getDefaultHoldSeconds() {
		return defaultHoldSeconds;
	}

	public boolean isDefaultPerSide() {
		return defaultPerSide;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public OffsetDateTime getUpdatedAt() {
		return updatedAt;
	}

	public boolean isDeleted() {
		return deleted;
	}

	public OffsetDateTime getDeletedAt() {
		return deletedAt;
	}

	/** name and nameNormalized always change together — never set independently (see hu.bumler.lm2.common.NameNormalizer). */
	public void rename(String name, String nameNormalized) {
		this.name = name;
		this.nameNormalized = nameNormalized;
	}

	public void setCategory(String category) {
		this.category = category;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public void setEquipment(String equipment) {
		this.equipment = equipment;
	}

	public void setFavorite(boolean favorite) {
		this.favorite = favorite;
	}

	public void setDefaultHoldSeconds(int defaultHoldSeconds) {
		this.defaultHoldSeconds = defaultHoldSeconds;
	}

	public void setDefaultPerSide(boolean defaultPerSide) {
		this.defaultPerSide = defaultPerSide;
	}

	public void softDelete() {
		this.deleted = true;
		this.deletedAt = OffsetDateTime.now();
	}
}
