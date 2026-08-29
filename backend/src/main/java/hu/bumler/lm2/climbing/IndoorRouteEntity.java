package hu.bumler.lm2.climbing;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Subfeatures/Indoor köteles admin.md — an optional fixed indoor-route catalogue entry
 * ("fix termi út katalógus"). Flat, user-owned CRUD, no name uniqueness. {@code absoluteDifficultyIndex}
 * is client-supplied (matrix-derived) and stored as-is.
 */
@Entity
@Table(name = "indoor_route")
public class IndoorRouteEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "gym_id", nullable = false)
	private UUID gymId;

	@Column(nullable = false)
	private String name;

	@Column(nullable = false)
	private String discipline;

	@Column(nullable = false)
	private String grade;

	@Column(name = "absolute_difficulty_index", nullable = false)
	private int absoluteDifficultyIndex;

	@Column
	private String sector;

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

	protected IndoorRouteEntity() {
	}

	public IndoorRouteEntity(UUID id, UUID userId, UUID gymId) {
		this.id = id;
		this.userId = userId;
		this.gymId = gymId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getGymId() {
		return gymId;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDiscipline() {
		return discipline;
	}

	public void setDiscipline(String discipline) {
		this.discipline = discipline;
	}

	public String getGrade() {
		return grade;
	}

	public void setGrade(String grade) {
		this.grade = grade;
	}

	public int getAbsoluteDifficultyIndex() {
		return absoluteDifficultyIndex;
	}

	public void setAbsoluteDifficultyIndex(int absoluteDifficultyIndex) {
		this.absoluteDifficultyIndex = absoluteDifficultyIndex;
	}

	public String getSector() {
		return sector;
	}

	public void setSector(String sector) {
		this.sector = sector;
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

	public void softDelete() {
		this.deleted = true;
		this.deletedAt = OffsetDateTime.now();
	}
}
