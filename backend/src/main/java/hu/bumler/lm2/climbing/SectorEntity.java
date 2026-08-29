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
 * documentation/Subfeatures/Outdoor boulder admin.md — a user-owned sector under a Crag. Flat,
 * user-owned CRUD, no name uniqueness. {@code defaultAspect} is a free-text default wall orientation
 * inherited by routes and the napló. The crag link is fixed at create time.
 */
@Entity
@Table(name = "sector")
public class SectorEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "crag_id", nullable = false)
	private UUID cragId;

	@Column(nullable = false)
	private String name;

	@Column(name = "default_aspect")
	private String defaultAspect;

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

	protected SectorEntity() {
	}

	public SectorEntity(UUID id, UUID userId, UUID cragId) {
		this.id = id;
		this.userId = userId;
		this.cragId = cragId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getCragId() {
		return cragId;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDefaultAspect() {
		return defaultAspect;
	}

	public void setDefaultAspect(String defaultAspect) {
		this.defaultAspect = defaultAspect;
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
