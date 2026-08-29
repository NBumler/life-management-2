package hu.bumler.lm2.climbing;

import java.time.LocalDate;
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
 * documentation/Features/Mászónapló.md — one logged climbing session, without its attempts. Nested
 * aggregate like {@code WorkoutSessionEntity}, three levels deep: climbing_session → ascent_attempt →
 * pitch_log. User-owned; the two child tables carry no user_id of their own. Stores no kcal / body
 * weight / volume — the day's {@code activityExtraKcal} and the Volume stat are pure client
 * calculations (documentation/Features/Tápérték kalkulátor.md).
 *
 * <p>{@code locationType} + {@code discipline} are discriminator columns — one flat table, the
 * context-specific fields ({@code gymId} vs {@code cragId}/{@code sectorId}, {@code weatherConditions},
 * {@code rockType}/{@code aspect}) are all nullable and which apply to which context is enforced
 * client-side.
 */
@Entity
@Table(name = "climbing_session")
public class ClimbingSessionEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "session_date", nullable = false)
	private LocalDate date;

	@Column(name = "location_type", nullable = false)
	private String locationType;

	@Column(nullable = false)
	private String discipline;

	@Column(name = "total_session_duration_minutes")
	private Integer totalSessionDurationMinutes;

	@Column(name = "pump_rating")
	private Integer pumpRating;

	@Column(name = "headspace_rating")
	private Integer headspaceRating;

	@Column
	private String notes;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "climbing_partners")
	private List<String> climbingPartners;

	@Column(name = "weather_conditions")
	private String weatherConditions;

	@Column(name = "gym_id")
	private UUID gymId;

	@Column(name = "gym_name")
	private String gymName;

	@Column(name = "crag_id")
	private UUID cragId;

	@Column(name = "crag_name")
	private String cragName;

	@Column(name = "sector_id")
	private UUID sectorId;

	@Column(name = "sector_name")
	private String sectorName;

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

	protected ClimbingSessionEntity() {
	}

	public ClimbingSessionEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public LocalDate getDate() {
		return date;
	}

	public void setDate(LocalDate date) {
		this.date = date;
	}

	public String getLocationType() {
		return locationType;
	}

	public void setLocationType(String locationType) {
		this.locationType = locationType;
	}

	public String getDiscipline() {
		return discipline;
	}

	public void setDiscipline(String discipline) {
		this.discipline = discipline;
	}

	public Integer getTotalSessionDurationMinutes() {
		return totalSessionDurationMinutes;
	}

	public void setTotalSessionDurationMinutes(Integer totalSessionDurationMinutes) {
		this.totalSessionDurationMinutes = totalSessionDurationMinutes;
	}

	public Integer getPumpRating() {
		return pumpRating;
	}

	public void setPumpRating(Integer pumpRating) {
		this.pumpRating = pumpRating;
	}

	public Integer getHeadspaceRating() {
		return headspaceRating;
	}

	public void setHeadspaceRating(Integer headspaceRating) {
		this.headspaceRating = headspaceRating;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public List<String> getClimbingPartners() {
		return climbingPartners;
	}

	public void setClimbingPartners(List<String> climbingPartners) {
		this.climbingPartners = climbingPartners == null ? null : new ArrayList<>(climbingPartners);
	}

	public String getWeatherConditions() {
		return weatherConditions;
	}

	public void setWeatherConditions(String weatherConditions) {
		this.weatherConditions = weatherConditions;
	}

	public UUID getGymId() {
		return gymId;
	}

	public void setGymId(UUID gymId) {
		this.gymId = gymId;
	}

	public String getGymName() {
		return gymName;
	}

	public void setGymName(String gymName) {
		this.gymName = gymName;
	}

	public UUID getCragId() {
		return cragId;
	}

	public void setCragId(UUID cragId) {
		this.cragId = cragId;
	}

	public String getCragName() {
		return cragName;
	}

	public void setCragName(String cragName) {
		this.cragName = cragName;
	}

	public UUID getSectorId() {
		return sectorId;
	}

	public void setSectorId(UUID sectorId) {
		this.sectorId = sectorId;
	}

	public String getSectorName() {
		return sectorName;
	}

	public void setSectorName(String sectorName) {
		this.sectorName = sectorName;
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
