package hu.bumler.lm2.tura;

import java.util.List;

/** [lon, lat] pontokhoz tartozó tengerszint feletti magasság (méter), a pontokkal azonos sorrendben. */
interface ElevationClient {

	List<Double> fetchElevations(List<double[]> points);
}
