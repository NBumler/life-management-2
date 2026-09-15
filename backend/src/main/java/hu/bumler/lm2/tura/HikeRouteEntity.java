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
 * backlog/tura-utvonaltervezo/103-... 2.1 fázis — kézzel rajzolt túraútvonal. User-owned, flat,
 * teljesen offline-szinkronizált entitás (ellentétben a {@link TrailSegmentEntity}-vel).
 * {@code coordinates} lapított [lon1, lat1, lon2, lat2, ...] tömb (natív Postgres
 * {@code double precision[]}, ugyanaz a minta, mint {@code TrailSegmentEntity} — a lon/lat párokra
 * bontást a {@link TrailSegmentMapper} statikus segédmetódusai végzik, package-shared).
 */
@Entity
@Table(name = "hike_route")
public class HikeRouteEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private String name;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(nullable = false)
	private List<Double> coordinates = new ArrayList<>();

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

	protected HikeRouteEntity() {
	}

	public HikeRouteEntity(UUID id, UUID userId) {
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

	public void setName(String name) {
		this.name = name;
	}

	public List<Double> getCoordinates() {
		return coordinates;
	}

	public void setCoordinates(List<Double> coordinates) {
		this.coordinates = coordinates;
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
