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

		String startNode = graph.snapToNearestEdge(startLon, startLat, MAX_SNAP_DISTANCE_METERS);
		String endNode = graph.snapToNearestEdge(endLon, endLat, MAX_SNAP_DISTANCE_METERS);
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
		private final List<RawEdge> rawEdges = new ArrayList<>();
		private int virtualNodeCounter = 0;

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
			rawEdges.add(new RawEdge(from, to));
		}

		double[] coordinateOf(String node) {
			return coordinateByNode.get(node);
		}

		/**
		 * Egy klikkelt pontot a hozzá legközelebb eső turistaút-ÉLRE (nem csak egy már ismert
		 * csomópontra/vertex-re) illeszt — a felhasználó a vonal bármely pontjára kattinthat, nem
		 * csak a ritkán elhelyezkedő OSM-vertex-ekre (ahogy pl. a Google Maps is a legközelebbi
		 * útpontra fog vinni, nem várja el a pixel-pontos találatot egy útkereszteződésen). A
		 * legközelebbi él vetített pontján egy virtuális csomópontot szúr be, ami a két végponthoz
		 * a megfelelő rész-távolsággal kapcsolódik, hogy az A* onnan/oda is tudjon útvonalat adni.
		 */
		String snapToNearestEdge(double lon, double lat, double maxDistanceMeters) {
			RawEdge bestEdge = null;
			double[] bestPoint = null;
			double bestDistance = Double.MAX_VALUE;
			for (RawEdge edge : rawEdges) {
				double[] a = coordinateByNode.get(edge.from());
				double[] b = coordinateByNode.get(edge.to());
				double[] projected = projectOntoSegment(lon, lat, a, b);
				double distance = GeoUtils.haversineMeters(lon, lat, projected[0], projected[1]);
				if (distance < bestDistance) {
					bestDistance = distance;
					bestEdge = edge;
					bestPoint = projected;
				}
			}
			if (bestEdge == null || bestDistance > maxDistanceMeters) {
				return null;
			}
			String virtualNode = "virtual:" + virtualNodeCounter++;
			coordinateByNode.put(virtualNode, bestPoint);
			double[] a = coordinateByNode.get(bestEdge.from());
			double[] b = coordinateByNode.get(bestEdge.to());
			connect(virtualNode, bestEdge.from(), GeoUtils.haversineMeters(bestPoint[0], bestPoint[1], a[0], a[1]));
			connect(virtualNode, bestEdge.to(), GeoUtils.haversineMeters(bestPoint[0], bestPoint[1], b[0], b[1]));
			return virtualNode;
		}

		private void connect(String from, String to, double weight) {
			adjacency.computeIfAbsent(from, ignored -> new ArrayList<>()).add(new Edge(to, weight));
			adjacency.computeIfAbsent(to, ignored -> new ArrayList<>()).add(new Edge(from, weight));
		}

		/**
		 * Merőleges vetítés az a→b szakaszra, egy lokális, egyenközű (equirectangular) síkbeli
		 * közelítésben — turistaút-szakasz léptékben (méterektől néhány km-ig) elég pontos. A `t`
		 * paramétert [0,1]-re szorítjuk, hogy a szakasz "meghosszabbításába" eső pont a legközelebbi
		 * végpontra illeszkedjen, ne egy a vonalon kívüli, extrapolált pontra.
		 */
		private static double[] projectOntoSegment(double lon, double lat, double[] a, double[] b) {
			double lonScale = Math.cos(Math.toRadians(a[1]));
			double ax = a[0] * lonScale;
			double ay = a[1];
			double bx = b[0] * lonScale;
			double by = b[1];
			double px = lon * lonScale;
			double py = lat;
			double dx = bx - ax;
			double dy = by - ay;
			double lengthSquared = dx * dx + dy * dy;
			double t = lengthSquared == 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
			t = Math.max(0, Math.min(1, t));
			return new double[] { (ax + t * dx) / lonScale, ay + t * dy };
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

		private record RawEdge(String from, String to) {
		}

		private record NodeEntry(String node, double fScore) {
		}
	}
}
