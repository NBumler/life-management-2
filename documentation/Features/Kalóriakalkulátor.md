A kalóriakalkulátor feature egyrészt a [[Profile]]-ban, [[Edzés]]ben, [[Mászónapló]]ban, [[Biciklizés napló]]ban, [[Lépésszám követés]]ben, [[Úszás napló]]ban megadott adatok alapján kiszámolja az aznapi elégetett kalóriát.
Másrészt a [[Profile]]-ban megadott adatok alapján kiszámolja, hogy mennyi kalóriát lehet ma még bevinni.
Harmadrészt erről csinál diagramokat is, hogy lehessen látni.

Képletek:
### [[Úszás napló]]
## Offline Kalóriaszámítási Logika
A frontend Store és a backend szerviz az alábbi MET (Metabolic Equivalent of Task) konstansokat használja a pillanatnyi égetett energia kiszámításához:

* `CASUAL` / `BREASTSTROKE`: 5.5 MET
* `BACKSTROKE`: 7.0 MET
* `CRAWL_FREESTYLE`: 8.0 MET
* `OPEN_WATER`: 9.5 MET
* `VIGOROUS` / `BUTTERFLY`: 11.0 MET

### Számítási képlet:
$$\text{Égetett Kalória} = \text{MET} \times \text{Testsúly (kg)} \times \left( \frac{\text{durationMinutes}}{60} \right)$$

Mentéskor a kiszámított értékkel az optimista UI azonnal megemeli a `Kalóriakalkulátor` mai bevihető keretét.


