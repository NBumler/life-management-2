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
 * documentation/Subfeatures/Outdoor köteles admin.md — a user-owned rope route under a Sector. Flat,
 * user-owned CRUD, no name uniqueness. {@code guidebookGrade} is the raw guidebook string, stored
 * verbatim (the napló parses it; no matrix index column). {@code lengthInMeters}/{@code totalPitches}/
 * {@code rockType}/{@code aspect} are optional napló prefill values. The sector link is fixed at
 * create time.
 */
@Entity
@Table(name = "route")
public class RouteEntity {

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

	@Column(name = "length_in_meters")
	private Double lengthInMeters;

	@Column(name = "total_pitches")
	private Integer totalPitches;

	@Column(name = "rock_type")
	private String rockType;

	@Column
	private String aspect;

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

	protected RouteEntity() {
	}

	public RouteEntity(UUID id, UUID userId, UUID sectorId) {
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

	public Double getLengthInMeters() {
		return lengthInMeters;
	}

	public void setLengthInMeters(Double lengthInMeters) {
		this.lengthInMeters = lengthInMeters;
	}

	public Integer getTotalPitches() {
		return totalPitches;
	}

	public void setTotalPitches(Integer totalPitches) {
		this.totalPitches = totalPitches;
	}

	public String getRockType() {
		return rockType;
	}

	public void setRockType(String rockType) {
		this.rockType = rockType;
	}

	public String getAspect() {
		return aspect;
	}

	public void setAspect(String aspect) {
		this.aspect = aspect;
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
