package hu.bumler.lm2.tura;

import java.util.List;

import hu.bumler.lm2.api.model.HikeRouteDay;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * backlog/tura-utvonaltervezo/103-... 2.4/2.5 fázis — a napi bontás (szakaszokra osztás) érvényességi
 * szabálya. Közös a HikeRoute és a CuratedRoute szolgáltatások közt: üres lista (egynapos túra)
 * mindig érvényes; egyébként a napok endWaypointIndex-ei szigorúan növekvők és a route-on belül
 * vannak, az utolsó nap pedig mindig a route utolsó pontjáig tart (nincs "lefedetlen" farok a végén).
 */
final class HikeRouteDayValidation {

	private HikeRouteDayValidation() {
	}

	static void validate(List<HikeRouteDay> days, int waypointCount) {
		if (days.isEmpty()) {
			return;
		}
		int previous = -1;
		for (HikeRouteDay day : days) {
			int index = day.getEndWaypointIndex();
			if (index <= previous || index >= waypointCount) {
				throw new ValidationException("Hike route days must have strictly increasing, in-range endWaypointIndex values", "days");
			}
			previous = index;
		}
		if (previous != waypointCount - 1) {
			throw new ValidationException("The last hike route day must end at the route's last waypoint", "days");
		}
	}
}
