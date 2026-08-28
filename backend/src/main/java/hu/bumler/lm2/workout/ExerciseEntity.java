package hu.bumler.lm2.workout;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** documentation/Subfeatures/Gyakorlat.md — user-owned exercise master catalog entry. */
@Entity
@Table(name = "exercise_catalog")
public class ExerciseEntity {

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

	@Column(nullable = false)
	private String kind;

	@Column(name = "default_rest_time_seconds")
	private Integer defaultRestTimeSeconds;

	@Column(name = "is_favorite", nullable = false)
	private boolean favorite = false;

	@Column
	private String equipment;

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

	protected ExerciseEntity() {
	}

	public ExerciseEntity(UUID id, UUID userId) {
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

	public String getKind() {
		return kind;
	}

	public Integer getDefaultRestTimeSeconds() {
		return defaultRestTimeSeconds;
	}

	public boolean isFavorite() {
		return favorite;
	}

	public String getEquipment() {
		return equipment;
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

	public void setKind(String kind) {
		this.kind = kind;
	}

	public void setDefaultRestTimeSeconds(Integer defaultRestTimeSeconds) {
		this.defaultRestTimeSeconds = defaultRestTimeSeconds;
	}

	public void setFavorite(boolean favorite) {
		this.favorite = favorite;
	}

	public void setEquipment(String equipment) {
		this.equipment = equipment;
	}

	public void softDelete() {
		this.deleted = true;
		this.deletedAt = OffsetDateTime.now();
	}
}
