package hu.bumler.lm2.profile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** documentation/Features/Profile.md — 1:1 per user; every field but id/userId is optional. */
@Entity
@Table(name = "user_profile")
public class ProfileEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "birth_date")
	private LocalDate birthDate;

	@Column
	private String sex;

	@Column(name = "height_cm")
	private BigDecimal heightCm;

	@Column(name = "current_weight_kg")
	private BigDecimal currentWeightKg;

	@Column
	private String goal;

	@Column(name = "kg_per_week")
	private BigDecimal kgPerWeek;

	@Column(name = "gross_monthly_salary_huf")
	private Long grossMonthlySalaryHuf;

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

	protected ProfileEntity() {
	}

	public ProfileEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public LocalDate getBirthDate() {
		return birthDate;
	}

	public void setBirthDate(LocalDate birthDate) {
		this.birthDate = birthDate;
	}

	public String getSex() {
		return sex;
	}

	public void setSex(String sex) {
		this.sex = sex;
	}

	public BigDecimal getHeightCm() {
		return heightCm;
	}

	public void setHeightCm(BigDecimal heightCm) {
		this.heightCm = heightCm;
	}

	public BigDecimal getCurrentWeightKg() {
		return currentWeightKg;
	}

	public void setCurrentWeightKg(BigDecimal currentWeightKg) {
		this.currentWeightKg = currentWeightKg;
	}

	public String getGoal() {
		return goal;
	}

	public void setGoal(String goal) {
		this.goal = goal;
	}

	public BigDecimal getKgPerWeek() {
		return kgPerWeek;
	}

	public void setKgPerWeek(BigDecimal kgPerWeek) {
		this.kgPerWeek = kgPerWeek;
	}

	public Long getGrossMonthlySalaryHuf() {
		return grossMonthlySalaryHuf;
	}

	public void setGrossMonthlySalaryHuf(Long grossMonthlySalaryHuf) {
		this.grossMonthlySalaryHuf = grossMonthlySalaryHuf;
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
}
