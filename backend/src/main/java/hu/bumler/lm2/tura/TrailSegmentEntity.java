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
 * backlog/tura-utvonaltervezo/104-... — shared/global turistaút-szakasz, OSM extract-importból.
 * Nem user-owned, nem szinkronizált entitás (lásd backlog/tura-utvonaltervezo/103-... 1. fázis
 * terve): a frontend bbox-alapú REST lekérdezéssel éri el, nem /api/sync/changes-en át.
 *
 * {@code coordinates} egy lapított [lon1, lat1, lon2, lat2, ...] tömb (natív Postgres
 * {@code double precision[]}, a {@link hu.bumler.lm2.gear.PackingSessionEntity} {@code source_template_ids}
 * mintáját követve) — a lon/lat párokra bontást a {@link TrailSegmentMapper} végzi.
 */
@Entity
@Table(name = "trail_segment")
public class TrailSegmentEntity {

	@Id
	private UUID id;

	@Column(name = "country_code", nullable = false)
	private String countryCode;

	@Column(name = "osm_way_id")
	private Long osmWayId;

	@Column(nullable = false)
	private String symbol;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(nullable = false)
	private List<Double> coordinates = new ArrayList<>();

	@Column(name = "min_lon", nullable = false)
	private double minLon;

	@Column(name = "min_lat", nullable = false)
	private double minLat;

	@Column(name = "max_lon", nullable = false)
	private double maxLon;

	@Column(name = "max_lat", nullable = false)
	private double maxLat;

	@Generated(event = EventType.INSERT)
	@Column(name = "created_at", insertable = false, updatable = false)
	private OffsetDateTime createdAt;

	@Generated(event = { EventType.INSERT, EventType.UPDATE })
	@Column(name = "updated_at", insertable = false, updatable = false)
	private OffsetDateTime updatedAt;

	protected TrailSegmentEntity() {
	}

	public TrailSegmentEntity(UUID id) {
		this.id = id;
	}

	public UUID getId() {
		return id;
	}

	public String getCountryCode() {
		return countryCode;
	}

	public void setCountryCode(String countryCode) {
		this.countryCode = countryCode;
	}

	public Long getOsmWayId() {
		return osmWayId;
	}

	public void setOsmWayId(Long osmWayId) {
		this.osmWayId = osmWayId;
	}

	public String getSymbol() {
		return symbol;
	}

	public void setSymbol(String symbol) {
		this.symbol = symbol;
	}

	public List<Double> getCoordinates() {
		return coordinates;
	}

	/** coordinates and the min/max bbox columns always change together — the bbox query relies on them. */
	public void setGeometry(List<Double> flattenedCoordinates, double minLon, double minLat, double maxLon, double maxLat) {
		this.coordinates = flattenedCoordinates;
		this.minLon = minLon;
		this.minLat = minLat;
		this.maxLon = maxLon;
		this.maxLat = maxLat;
	}

	public double getMinLon() {
		return minLon;
	}

	public double getMinLat() {
		return minLat;
	}

	public double getMaxLon() {
		return maxLon;
	}

	public double getMaxLat() {
		return maxLat;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public OffsetDateTime getUpdatedAt() {
		return updatedAt;
	}
}
