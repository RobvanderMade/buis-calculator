/** Standaardwaarden voor de prijsberekening in de calculator */
export const DEFAULT_PRICING = {
  /** Extra kosten per bocht/regel (na de eerste), in € */
  prijsPerLijn: 2,
  /** Factor op prijs per meter voor buiskosten: buisMeterFactor × prijsPerMTR */
  buisMeterFactor: 6,
  /** Beschikbare buislengte (mm) om stuks per buis te berekenen */
  buisLengteMm: 5980,
  /** Vaste kosten per order (€), verdeeld over het aantal stuks */
  vasteKosten: 60,
  /** Maximale gestrekte lengte (mm) */
  maxGestrekteLengteMm: 6000,
}
