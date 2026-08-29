package hu.bumler.lm2.workout;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Features/Biciklizés napló.md — one logged bike ride ("egy napló = egy út").
 * Flat, user-owned, plain CRUD like {@code LifePlanEntity} / {@code SwimLogEntity}. No kcal /
 * body-weight column: the aznapi activityExtraKcal contribution is a pure client calculation
 * (documentation/Features/Tápérték kalkulátor.md). {@code distanceKm} / {@code elevationGainMeters}
 * are log/statistics only (plus a UI avg-speed MET hint), never part of the MET formula.
 */
@Entity
@Table(name = "bike_ride_log")
public class BikeRideLogEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "ride_date", nullable = false)
	private LocalDate rideDate;

	@Column(name = "duration_minutes", nullable = false)
	private int durationMinutes;

	@Column(nullable = false)
	private String intensity;

	@Column(name = "distance_km")
	private Double distanceKm;

	@Column(name = "elevation_gain_meters")
	private Integer elevationGainMeters;

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

	protected BikeRideLogEntity() {
	}

	public BikeRideLogEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public LocalDate getRideDate() {
		return rideDate;
	}

	public void setRideDate(LocalDate rideDate) {
		this.rideDate = rideDate;
	}

	public int getDurationMinutes() {
		return durationMinutes;
	}

	public void setDurationMinutes(int durationMinutes) {
		this.durationMinutes = durationMinutes;
	}

	public String getIntensity() {
		return intensity;
	}

	public void setIntensity(String intensity) {
		this.intensity = intensity;
	}

	public Double getDistanceKm() {
		return distanceKm;
	}

	public void setDistanceKm(Double distanceKm) {
		this.distanceKm = distanceKm;
	}

	public Integer getElevationGainMeters() {
		return elevationGainMeters;
	}

	public void setElevationGainMeters(Integer elevationGainMeters) {
		this.elevationGainMeters = elevationGainMeters;
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
