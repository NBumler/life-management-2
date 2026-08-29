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
 * documentation/Features/Mászónapló.md "Entitás — AscentAttempt" — one logged attempt on a problem /
 * route. Only ever saved nested inside a {@link ClimbingSessionEntity} (documentation/Architektúra/
 * Backend.md "Nested aggregate PUT"), but its own sync row. No {@code user_id} — ownership flows
 * through {@code sessionId}, same shape as {@code workout_exercise_entry}. {@code deleted} is only for
 * the parent session's cascade soft-delete and the nested-PUT tree diff. The colour-band / route /
 * problem ids are soft links; the {@code *Name} / {@code color*} / {@code gradeRange} snapshot columns
 * are what the napló renders.
 */
@Entity
@Table(name = "ascent_attempt")
public class AscentAttemptEntity {

	@Id
	private UUID id;

	@Column(name = "session_id", nullable = false)
	private UUID sessionId;

	@Column(name = "is_success", nullable = false)
	private boolean success;

	@Column(name = "user_raw_input")
	private String userRawInput;

	@Column(name = "absolute_difficulty_index")
	private Integer absoluteDifficultyIndex;

	@Column(name = "ascent_style")
	private String ascentStyle;

	@Column(name = "safety_style")
	private String safetyStyle;

	@Column(name = "failure_point")
	private String failurePoint;

	@Column(name = "attempt_count")
	private Integer attemptCount;

	@Column(name = "color_band_id")
	private UUID colorBandId;

	@Column(name = "color_name")
	private String colorName;

	@Column(name = "hex_color")
	private String hexColor;

	@Column(name = "grade_range")
	private String gradeRange;

	@Column(name = "indoor_route_id")
	private UUID indoorRouteId;

	@Column(name = "route_id")
	private UUID routeId;

	@Column(name = "boulder_problem_id")
	private UUID boulderProblemId;

	@Column(name = "route_name")
	private String routeName;

	@Column(name = "length_in_meters")
	private Double lengthInMeters;

	@Column
	private String notes;

	@Column(name = "order_index", nullable = false)
	private int orderIndex;

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

	protected AscentAttemptEntity() {
	}

	public AscentAttemptEntity(UUID id, UUID sessionId) {
		this.id = id;
		this.sessionId = sessionId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getSessionId() {
		return sessionId;
	}

	public boolean isSuccess() {
		return success;
	}

	public void setSuccess(boolean success) {
		this.success = success;
	}

	public String getUserRawInput() {
		return userRawInput;
	}

	public void setUserRawInput(String userRawInput) {
		this.userRawInput = userRawInput;
	}

	public Integer getAbsoluteDifficultyIndex() {
		return absoluteDifficultyIndex;
	}

	public void setAbsoluteDifficultyIndex(Integer absoluteDifficultyIndex) {
		this.absoluteDifficultyIndex = absoluteDifficultyIndex;
	}

	public String getAscentStyle() {
		return ascentStyle;
	}

	public void setAscentStyle(String ascentStyle) {
		this.ascentStyle = ascentStyle;
	}

	public String getSafetyStyle() {
		return safetyStyle;
	}

	public void setSafetyStyle(String safetyStyle) {
		this.safetyStyle = safetyStyle;
	}

	public String getFailurePoint() {
		return failurePoint;
	}

	public void setFailurePoint(String failurePoint) {
		this.failurePoint = failurePoint;
	}

	public Integer getAttemptCount() {
		return attemptCount;
	}

	public void setAttemptCount(Integer attemptCount) {
		this.attemptCount = attemptCount;
	}

	public UUID getColorBandId() {
		return colorBandId;
	}

	public void setColorBandId(UUID colorBandId) {
		this.colorBandId = colorBandId;
	}

	public String getColorName() {
		return colorName;
	}

	public void setColorName(String colorName) {
		this.colorName = colorName;
	}

	public String getHexColor() {
		return hexColor;
	}

	public void setHexColor(String hexColor) {
		this.hexColor = hexColor;
	}

	public String getGradeRange() {
		return gradeRange;
	}

	public void setGradeRange(String gradeRange) {
		this.gradeRange = gradeRange;
	}

	public UUID getIndoorRouteId() {
		return indoorRouteId;
	}

	public void setIndoorRouteId(UUID indoorRouteId) {
		this.indoorRouteId = indoorRouteId;
	}

	public UUID getRouteId() {
		return routeId;
	}

	public void setRouteId(UUID routeId) {
		this.routeId = routeId;
	}

	public UUID getBoulderProblemId() {
		return boulderProblemId;
	}

	public void setBoulderProblemId(UUID boulderProblemId) {
		this.boulderProblemId = boulderProblemId;
	}

	public String getRouteName() {
		return routeName;
	}

	public void setRouteName(String routeName) {
		this.routeName = routeName;
	}

	public Double getLengthInMeters() {
		return lengthInMeters;
	}

	public void setLengthInMeters(Double lengthInMeters) {
		this.lengthInMeters = lengthInMeters;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public int getOrderIndex() {
		return orderIndex;
	}

	public void setOrderIndex(int orderIndex) {
		this.orderIndex = orderIndex;
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

	/** Reverses {@link #softDelete()} — a tombstoned row reappearing in an incoming live tree is revived, not left dead underneath it. */
	public void undelete() {
		this.deleted = false;
		this.deletedAt = null;
	}
}
