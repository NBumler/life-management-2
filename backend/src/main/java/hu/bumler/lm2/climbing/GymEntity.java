package hu.bumler.lm2.climbing;

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
 * documentation/Subfeatures/Indoor boulder admin.md + Indoor köteles admin.md — a user-owned indoor
 * climbing gym. The same row backs the boulder and rope admin; {@code disciplines} (a non-empty
 * subset of {BOULDER, ROPE}) records which it is set up for. {@code defaultWallHeightMeters} and
 * {@code availableSafetyStyles} are rope-only config. Flat, user-owned CRUD like
 * {@code ExerciseEntity}; {@code name_normalized} is application-written (hu.bumler.lm2.common.NameNormalizer).
 */
@Entity
@Table(name = "gym")
public class GymEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private String name;

	@Column(name = "name_normalized", nullable = false)
	private String nameNormalized;

	@Column
	private String address;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(nullable = false)
	private List<String> disciplines = new ArrayList<>();

	@Column(name = "default_wall_height_meters")
	private Double defaultWallHeightMeters;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "available_safety_styles")
	private List<String> availableSafetyStyles;

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

	protected GymEntity() {
	}

	public GymEntity(UUID id, UUID userId) {
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

	/** name and nameNormalized always change together (see hu.bumler.lm2.common.NameNormalizer). */
	public void rename(String name, String nameNormalized) {
		this.name = name;
		this.nameNormalized = nameNormalized;
	}

	public String getAddress() {
		return address;
	}

	public void setAddress(String address) {
		this.address = address;
	}

	public List<String> getDisciplines() {
		return disciplines;
	}

	public void setDisciplines(List<String> disciplines) {
		this.disciplines = disciplines;
	}

	public Double getDefaultWallHeightMeters() {
		return defaultWallHeightMeters;
	}

	public void setDefaultWallHeightMeters(Double defaultWallHeightMeters) {
		this.defaultWallHeightMeters = defaultWallHeightMeters;
	}

	public List<String> getAvailableSafetyStyles() {
		return availableSafetyStyles;
	}

	public void setAvailableSafetyStyles(List<String> availableSafetyStyles) {
		this.availableSafetyStyles = availableSafetyStyles;
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
