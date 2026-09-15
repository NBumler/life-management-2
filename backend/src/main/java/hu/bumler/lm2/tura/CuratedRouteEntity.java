package hu.bumler.lm2.tura;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.generator.EventType;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * backlog/tura-utvonaltervezo/103-... 2.5 fázis — admin-szerkesztett/OSM-eredetű ajánlott túra.
 * Megosztott referenciaadat, mint a {@link TrailSegmentEntity}: nincs user_id, nincs deleted
 * tombstone (admin hard-delete-tel törli), nem szinkronizált entitás.
 *
 * {@code daysJson} ugyanaz a minta, mint {@link HikeRouteEntity#getDaysJson()} — pre-szerializált
 * JSON, nem önálló entitás/tábla.
 */
@Entity
@Table(name = "curated_route")
public class CuratedRouteEntity {

	@Id
	private UUID id;

	@Column(nullable = false)
	private String name;

	private String description;

	@Column(nullable = false)
	private String difficulty;

	@Column(name = "activity_type", nullable = false)
	private String activityType;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(nullable = false)
	private List<Double> coordinates = new ArrayList<>();

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "days")
	private String daysJson;

	@Column(name = "distance_meters", nullable = false)
	private double distanceMeters;

	@Column(name = "elevation_gain_meters", nullable = false)
	private double elevationGainMeters;

	@Column(name = "elevation_loss_meters", nullable = false)
	private double elevationLossMeters;

	@Column(name = "estimated_duration_minutes", nullable = false)
	private double estimatedDurationMinutes;

	@Generated(event = EventType.INSERT)
	@Column(name = "created_at", insertable = false, updatable = false)
	private OffsetDateTime createdAt;

	@Generated(event = { EventType.INSERT, EventType.UPDATE })
	@Column(name = "updated_at", insertable = false, updatable = false)
	private OffsetDateTime updatedAt;

	protected CuratedRouteEntity() {
	}

	CuratedRouteEntity(UUID id) {
		this.id = id;
	}

	public UUID getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getDifficulty() {
		return difficulty;
	}

	public void setDifficulty(String difficulty) {
		this.difficulty = difficulty;
	}

	public String getActivityType() {
		return activityType;
	}

	public void setActivityType(String activityType) {
		this.activityType = activityType;
	}

	public List<Double> getCoordinates() {
		return coordinates;
	}

	public void setCoordinates(List<Double> coordinates) {
		this.coordinates = coordinates;
	}

	public String getDaysJson() {
		return daysJson;
	}

	public void setDaysJson(String daysJson) {
		this.daysJson = daysJson;
	}

	public double getDistanceMeters() {
		return distanceMeters;
	}

	public void setDistanceMeters(double distanceMeters) {
		this.distanceMeters = distanceMeters;
	}

	public double getElevationGainMeters() {
		return elevationGainMeters;
	}

	public void setElevationGainMeters(double elevationGainMeters) {
		this.elevationGainMeters = elevationGainMeters;
	}

	public double getElevationLossMeters() {
		return elevationLossMeters;
	}

	public void setElevationLossMeters(double elevationLossMeters) {
		this.elevationLossMeters = elevationLossMeters;
	}

	public double getEstimatedDurationMinutes() {
		return estimatedDurationMinutes;
	}

	public void setEstimatedDurationMinutes(double estimatedDurationMinutes) {
		this.estimatedDurationMinutes = estimatedDurationMinutes;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public OffsetDateTime getUpdatedAt() {
		return updatedAt;
	}
}
