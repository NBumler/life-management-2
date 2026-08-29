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
 * documentation/Subfeatures/Indoor boulder admin.md — one colour band of an indoor boulder gym: a
 * wall colour mapped to a grade range. {@code hexColor} holds the canonical form
 * (hu.bumler.lm2.common.HexColorNormalizer) and is unique among the gym's live bands. The
 * {@code absoluteDifficultyIndex*} values are client-supplied (matrix-derived) and stored as-is.
 */
@Entity
@Table(name = "gym_color_band")
public class GymColorBandEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "gym_id", nullable = false)
	private UUID gymId;

	@Column(nullable = false)
	private String name;

	@Column(name = "hex_color", nullable = false)
	private String hexColor;

	@Column(nullable = false)
	private String variant;

	@Column(name = "grade_lower", nullable = false)
	private String gradeLower;

	@Column(name = "grade_upper", nullable = false)
	private String gradeUpper;

	@Column(name = "absolute_difficulty_index_lower", nullable = false)
	private int absoluteDifficultyIndexLower;

	@Column(name = "absolute_difficulty_index_upper", nullable = false)
	private int absoluteDifficultyIndexUpper;

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

	protected GymColorBandEntity() {
	}

	public GymColorBandEntity(UUID id, UUID userId, UUID gymId) {
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

	public String getHexColor() {
		return hexColor;
	}

	public void setHexColor(String hexColor) {
		this.hexColor = hexColor;
	}

	public String getVariant() {
		return variant;
	}

	public void setVariant(String variant) {
		this.variant = variant;
	}

	public String getGradeLower() {
		return gradeLower;
	}

	public void setGradeLower(String gradeLower) {
		this.gradeLower = gradeLower;
	}

	public String getGradeUpper() {
		return gradeUpper;
	}

	public void setGradeUpper(String gradeUpper) {
		this.gradeUpper = gradeUpper;
	}

	public int getAbsoluteDifficultyIndexLower() {
		return absoluteDifficultyIndexLower;
	}

	public void setAbsoluteDifficultyIndexLower(int absoluteDifficultyIndexLower) {
		this.absoluteDifficultyIndexLower = absoluteDifficultyIndexLower;
	}

	public int getAbsoluteDifficultyIndexUpper() {
		return absoluteDifficultyIndexUpper;
	}

	public void setAbsoluteDifficultyIndexUpper(int absoluteDifficultyIndexUpper) {
		this.absoluteDifficultyIndexUpper = absoluteDifficultyIndexUpper;
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
