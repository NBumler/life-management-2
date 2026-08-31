package hu.bumler.lm2.aycm;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md — a user-owned AYCM acceptance venue.
 * Flat, user-owned CRUD like {@code GearItemEntity}; {@code name} is unique among the user's live
 * partners. Price rules are a separate sub-resource; deleting a partner cascades to its live rules
 * (see {@code AycmPartnerService}) but never to {@code AycmCheckIn} snapshots.
 */
@Entity
@Table(name = "aycm_partner")
public class AycmPartnerEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private String name;

	@Column(name = "name_normalized", nullable = false)
	private String nameNormalized;

	@Column
	private String notes;

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

	protected AycmPartnerEntity() {
	}

	public AycmPartnerEntity(UUID id, UUID userId) {
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

	public String getNotes() {
		return notes;
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

	/** name and nameNormalized always change together (see hu.bumler.lm2.common.NameNormalizer). */
	public void rename(String name, String nameNormalized) {
		this.name = name;
		this.nameNormalized = nameNormalized;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public void softDelete() {
		this.deleted = true;
		this.deletedAt = OffsetDateTime.now();
	}
}
