package hu.bumler.lm2.tura;

import java.math.BigDecimal;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.RouteSuggestion;

/**
 * backlog/tura-utvonaltervezo/103-... 2.2 fázis — automatikus útvonal-generálás két pont közt a
 * jelzett turistaút-hálózaton. Saját A* a {@link TrailSegmentEntity} adatból felépített gráfon
 * (nem külső routing motor — ld. a terv indoklását: a magyar turistaút-gráf jóval kisebb, mint egy
 * teljes úthálózat). A gráf minden kéréskor újraépül a teljes ország-hálózatból; ez a fázis a
 * helyességet célozza, nem a gráf-építés cache-elését.
 */
@Service
class RouteSuggestionService {

	/**
	 * Ha a kért kezdő-/végpont a legközelebbi ismert turistaút-csomóponttól is ennél messzebb van,
	 * a pont nincs turistaút közelében — nincs értelme "útvonalat javasolni" hozzá.
	 */
	private static final double MAX_SNAP_DISTANCE_METERS = 2_000;

	/** Két pontot ugyanannak a csomópontnak tekintünk, ha ~11 cm-nél közelebb esnek egymáshoz. */
	private static final double NODE_KEY_PRECISION = 1_000_000;

	private final TrailSegmentRepository repository;

	RouteSuggestionService(TrailSegmentRepository repository) {
		this.repository = repository;
	}

	@Transactional(readOnly = true)
	RouteSuggestion suggest(String countryCode, double startLon, double startLat, double endLon, double endLat) {
		Graph graph = buildGraph(repository.findByCountryCode(countryCode));

		String startNode = graph.nearestNode(startLon, startLat, MAX_SNAP_DISTANCE_METERS);
		String endNode = graph.nearestNode(endLon, endLat, MAX_SNAP_DISTANCE_METERS);
		if (startNode == null || endNode == null) {
			return notFound();
		}

		List<String> pathNodes = graph.shortestPath(startNode, endNode);
		if (pathNodes == null) {
			return notFound();
		}

		List<double[]> coordinates = new ArrayList<>(pathNodes.size() + 2);
		coordinates.add(new double[] { startLon, startLat });
		for (String node : pathNodes) {
			double[] point = graph.coordinateOf(node);
			double[] last = coordinates.get(coordinates.size() - 1);
			if (GeoUtils.haversineMeters(last[0], last[1], point[0], point[1]) > 0.1) {
				coordinates.add(point);
			}
		}
		double[] last = coordinates.get(coordinates.size() - 1);
		if (GeoUtils.haversineMeters(last[0], last[1], endLon, endLat) > 0.1) {
			coordinates.add(new double[] { endLon, endLat });
		}

		double distanceMeters = 0;
		for (int i = 1; i < coordinates.size(); i++) {
			double[] a = coordinates.get(i - 1);
			double[] b = coordinates.get(i);
			distanceMeters += GeoUtils.haversineMeters(a[0], a[1], b[0], b[1]);
		}

		List<List<BigDecimal>> pairs = new ArrayList<>(coordinates.size());
		for (double[] point : coordinates) {
			pairs.add(List.of(BigDecimal.valueOf(point[0]), BigDecimal.valueOf(point[1])));
		}
		return new RouteSuggestion(true, pairs, BigDecimal.valueOf(distanceMeters));
	}

	private static RouteSuggestion notFound() {
		return new RouteSuggestion(false, List.of(), BigDecimal.ZERO);
	}

	private static Graph buildGraph(List<TrailSegmentEntity> segments) {
		Graph graph = new Graph();
		for (TrailSegmentEntity segment : segments) {
			List<Double> flattened = segment.getCoordinates();
			for (int i = 0; i + 3 < flattened.size(); i += 2) {
				double lon1 = flattened.get(i);
				double lat1 = flattened.get(i + 1);
				double lon2 = flattened.get(i + 2);
				double lat2 = flattened.get(i + 3);
				graph.addEdge(lon1, lat1, lon2, lat2);
			}
		}
		return graph;
	}

	/** In-memory undirected graph over trail-segment vertices, snapped to a shared-endpoint key. */
	private static final class Graph {

		private final Map<String, double[]> coordinateByNode = new HashMap<>();
		private final Map<String, List<Edge>> adjacency = new HashMap<>();

		void addEdge(double lon1, double lat1, double lon2, double lat2) {
			String from = key(lon1, lat1);
			String to = key(lon2, lat2);
			if (from.equals(to)) {
				return;
			}
			coordinateByNode.putIfAbsent(from, new double[] { lon1, lat1 });
			coordinateByNode.putIfAbsent(to, new double[] { lon2, lat2 });
			double weight = GeoUtils.haversineMeters(lon1, lat1, lon2, lat2);
			adjacency.computeIfAbsent(from, ignored -> new ArrayList<>()).add(new Edge(to, weight));
			adjacency.computeIfAbsent(to, ignored -> new ArrayList<>()).add(new Edge(from, weight));
		}

		double[] coordinateOf(String node) {
			return coordinateByNode.get(node);
		}

		String nearestNode(double lon, double lat, double maxDistanceMeters) {
			String nearest = null;
			double nearestDistance = Double.MAX_VALUE;
			for (Map.Entry<String, double[]> entry : coordinateByNode.entrySet()) {
				double[] point = entry.getValue();
				double distance = GeoUtils.haversineMeters(lon, lat, point[0], point[1]);
				if (distance < nearestDistance) {
					nearestDistance = distance;
					nearest = entry.getKey();
				}
			}
			return nearestDistance <= maxDistanceMeters ? nearest : null;
		}

		/**
		 * A* a haversine-egyenes-távolság heurisztikával (mindig <= a tényleges úthossz, tehát
		 * elfogadható). Lazy deletion: mivel Java {@link PriorityQueue} nem támogat decrease-key
		 * műveletet, egy csomópontra több, elavult bejegyzés is kerülhet a sorba — a {@code closed}
		 * halmaz szűri ki ezeket ahelyett, hogy a már véglegesített gScore-t felülírnák.
		 */
		List<String> shortestPath(String start, String goal) {
			if (start.equals(goal)) {
				return List.of(start);
			}
			double[] goalPoint = coordinateByNode.get(goal);
			Map<String, Double> gScore = new HashMap<>();
			Map<String, String> cameFrom = new HashMap<>();
			Set<String> closed = new HashSet<>();
			PriorityQueue<NodeEntry> open = new PriorityQueue<>(Comparator.comparingDouble(NodeEntry::fScore));
			gScore.put(start, 0d);
			open.add(new NodeEntry(start, heuristic(start, goalPoint)));

			while (!open.isEmpty()) {
				String current = open.poll().node();
				if (!closed.add(current)) {
					continue;
				}
				if (current.equals(goal)) {
					return reconstructPath(cameFrom, current);
				}
				double currentG = gScore.get(current);
				for (Edge edge : adjacency.getOrDefault(current, List.of())) {
					if (closed.contains(edge.to())) {
						continue;
					}
					double tentativeG = currentG + edge.weight();
					if (tentativeG < gScore.getOrDefault(edge.to(), Double.MAX_VALUE)) {
						cameFrom.put(edge.to(), current);
						gScore.put(edge.to(), tentativeG);
						open.add(new NodeEntry(edge.to(), tentativeG + heuristic(edge.to(), goalPoint)));
					}
				}
			}
			return null;
		}

		private double heuristic(String node, double[] goalPoint) {
			double[] point = coordinateByNode.get(node);
			return GeoUtils.haversineMeters(point[0], point[1], goalPoint[0], goalPoint[1]);
		}

		private static List<String> reconstructPath(Map<String, String> cameFrom, String goal) {
			Deque<String> path = new ArrayDeque<>();
			String current = goal;
			path.addFirst(current);
			while (cameFrom.containsKey(current)) {
				current = cameFrom.get(current);
				path.addFirst(current);
			}
			return new ArrayList<>(path);
		}

		private static String key(double lon, double lat) {
			long lonKey = Math.round(lon * NODE_KEY_PRECISION);
			long latKey = Math.round(lat * NODE_KEY_PRECISION);
			return lonKey + ":" + latKey;
		}

		private record Edge(String to, double weight) {
		}

		private record NodeEntry(String node, double fScore) {
		}
	}
}
