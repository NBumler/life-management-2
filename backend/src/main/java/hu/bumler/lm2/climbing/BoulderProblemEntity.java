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
 * documentation/Subfeatures/Outdoor boulder admin.md — an optional user-owned boulder problem master
 * under a Sector; the napló can also create ad-hoc problems without one. Flat, user-owned CRUD, no
 * name uniqueness. {@code guidebookGrade} is the raw guidebook string, stored verbatim. The sector
 * link is fixed at create time.
 */
@Entity
@Table(name = "boulder_problem")
public class BoulderProblemEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "sector_id", nullable = false)
	private UUID sectorId;

	@Column(nullable = false)
	private String name;

	@Column(name = "guidebook_grade", nullable = false)
	private String guidebookGrade;

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

	protected BoulderProblemEntity() {
	}

	public BoulderProblemEntity(UUID id, UUID userId, UUID sectorId) {
		this.id = id;
		this.userId = userId;
		this.sectorId = sectorId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getSectorId() {
		return sectorId;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getGuidebookGrade() {
		return guidebookGrade;
	}

	public void setGuidebookGrade(String guidebookGrade) {
		this.guidebookGrade = guidebookGrade;
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
