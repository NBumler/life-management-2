package hu.bumler.lm2.aycm;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.AycmPriceRule;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md — price-rule CRUD scoped to a partner.
 * A rule is a half-open [startTime, endTime) window on the flagged weekdays. On save the server
 * re-checks: at least one weekday flag, endTime strictly after startTime (max "24:00"), non-negative
 * prices, and — the load-bearing rule — no interval overlap with the partner's OTHER live rules on a
 * shared weekday. The client checks the same thing first (friendlier message); this guards the
 * multi-device race. The server never runs {@code matchPriceRule}.
 */
@Service
class AycmPriceRuleService {

	private final AycmPriceRuleRepository repository;
	private final AycmPartnerRepository partnerRepository;
	private final AycmPriceRuleMapper mapper;

	AycmPriceRuleService(AycmPriceRuleRepository repository, AycmPartnerRepository partnerRepository,
			AycmPriceRuleMapper mapper) {
		this.repository = repository;
		this.partnerRepository = partnerRepository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<AycmPriceRule> list(UUID userId, UUID partnerId) {
		requireLivePartner(userId, partnerId);
		return repository.findByPartnerIdAndUserIdAndDeletedFalseOrderByStartTimeAsc(partnerId, userId).stream()
				.map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	AycmPriceRule get(UUID userId, UUID partnerId, UUID ruleId) {
		AycmPriceRuleEntity entity = repository.findByIdAndUserId(ruleId, userId)
				.map(existing -> requirePartner(existing, partnerId))
				.orElseThrow(() -> new EntityNotFoundException("No such price rule"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id. */
	@Transactional
	AycmPriceRule create(UUID userId, UUID partnerId, AycmPriceRule dto) {
		requireLivePartner(userId, partnerId);
		AycmPriceRuleEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.map(existing -> requirePartner(existing, partnerId))
				.orElseGet(() -> new AycmPriceRuleEntity(dto.getId(), userId, partnerId));
		applyFields(entity, userId, partnerId, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	AycmPriceRule update(UUID userId, UUID partnerId, UUID ruleId, AycmPriceRule dto) {
		requireLivePartner(userId, partnerId);
		AycmPriceRuleEntity entity = repository.findByIdAndUserId(ruleId, userId)
				.map(existing -> requirePartner(existing, partnerId))
				.orElseThrow(() -> new EntityNotFoundException("No such price rule"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Price rule already deleted");
		}
		applyFields(entity, userId, partnerId, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. Past Check-In snapshots are untouched. */
	@Transactional
	AycmPriceRule delete(UUID userId, UUID partnerId, UUID ruleId) {
		AycmPriceRuleEntity entity = repository.findByIdAndUserId(ruleId, userId)
				.map(existing -> requirePartner(existing, partnerId))
				.orElseThrow(() -> new EntityNotFoundException("No such price rule"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(AycmPriceRuleEntity entity, UUID userId, UUID partnerId, AycmPriceRule dto) {
		boolean mon = Boolean.TRUE.equals(dto.getAppliesMon());
		boolean tue = Boolean.TRUE.equals(dto.getAppliesTue());
		boolean wed = Boolean.TRUE.equals(dto.getAppliesWed());
		boolean thu = Boolean.TRUE.equals(dto.getAppliesThu());
		boolean fri = Boolean.TRUE.equals(dto.getAppliesFri());
		boolean sat = Boolean.TRUE.equals(dto.getAppliesSat());
		boolean sun = Boolean.TRUE.equals(dto.getAppliesSun());
		if (!(mon || tue || wed || thu || fri || sat || sun)) {
			throw new ValidationException("At least one weekday must be selected", "appliesMon");
		}
		int start = parseMinutes(dto.getStartTime(), "startTime", false);
		int end = parseMinutes(dto.getEndTime(), "endTime", true);
		if (end <= start) {
			throw new ValidationException("endTime must be after startTime", "endTime");
		}
		if (dto.getListPriceHuf() < 0) {
			throw new ValidationException("listPriceHuf must not be negative", "listPriceHuf");
		}
		if (dto.getCoPaymentHuf() < 0) {
			throw new ValidationException("coPaymentHuf must not be negative", "coPaymentHuf");
		}

		boolean[] days = { mon, tue, wed, thu, fri, sat, sun };
		for (AycmPriceRuleEntity other : repository
				.findByPartnerIdAndUserIdAndDeletedFalseOrderByStartTimeAsc(partnerId, userId)) {
			if (other.getId().equals(entity.getId())) {
				continue;
			}
			if (!sharesWeekday(days, other)) {
				continue;
			}
			int otherStart = parseMinutes(other.getStartTime(), "startTime", false);
			int otherEnd = parseMinutes(other.getEndTime(), "endTime", true);
			if (start < otherEnd && otherStart < end) {
				throw new ValidationException("Time band overlaps another live rule of this partner", "startTime");
			}
		}

		entity.setLabel(dto.getLabel().map(String::trim).filter(s -> !s.isEmpty()).orElse(null));
		entity.setAppliesMon(mon);
		entity.setAppliesTue(tue);
		entity.setAppliesWed(wed);
		entity.setAppliesThu(thu);
		entity.setAppliesFri(fri);
		entity.setAppliesSat(sat);
		entity.setAppliesSun(sun);
		entity.setStartTime(dto.getStartTime());
		entity.setEndTime(dto.getEndTime());
		entity.setListPriceHuf(dto.getListPriceHuf());
		entity.setCoPaymentHuf(dto.getCoPaymentHuf());
	}

	private static boolean sharesWeekday(boolean[] days, AycmPriceRuleEntity other) {
		return (days[0] && other.isAppliesMon()) || (days[1] && other.isAppliesTue()) || (days[2] && other.isAppliesWed())
				|| (days[3] && other.isAppliesThu()) || (days[4] && other.isAppliesFri())
				|| (days[5] && other.isAppliesSat()) || (days[6] && other.isAppliesSun());
	}

	private static int parseMinutes(String hhmm, String field, boolean allowEndOfDay) {
		if (hhmm == null || !hhmm.matches("\\d{2}:\\d{2}")) {
			throw new ValidationException("Invalid time (expected HH:mm)", field);
		}
		int hours = Integer.parseInt(hhmm.substring(0, 2));
		int minutes = Integer.parseInt(hhmm.substring(3, 5));
		if (minutes > 59) {
			throw new ValidationException("Invalid time (minutes out of range)", field);
		}
		int total = hours * 60 + minutes;
		int max = allowEndOfDay ? 24 * 60 : 23 * 60 + 59;
		if (total < 0 || total > max) {
			throw new ValidationException("Time out of range", field);
		}
		return total;
	}

	private void requireLivePartner(UUID userId, UUID partnerId) {
		AycmPartnerEntity partner = partnerRepository.findByIdAndUserId(partnerId, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such partner"));
		if (partner.isDeleted()) {
			throw new EntityNotFoundException("No such partner");
		}
	}

	private static AycmPriceRuleEntity requireOwner(AycmPriceRuleEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such price rule");
		}
		return entity;
	}

	/**
	 * The rule must live under the partner named in the path ({@code /aycm-partners/{id}/price-rules/...}).
	 * Without this a rule could be read, edited (against the wrong partner's overlap set) or deleted
	 * through any other partner's path — the OpenAPI contract promises 404 there.
	 */
	private static AycmPriceRuleEntity requirePartner(AycmPriceRuleEntity entity, UUID partnerId) {
		if (!entity.getPartnerId().equals(partnerId)) {
			throw new EntityNotFoundException("No such price rule");
		}
		return entity;
	}
}
