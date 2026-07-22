# Giga feature napló specifikáció (Ideiglenes specifikáció)

## Business

| | |
|---|---|
| **Státusz** | `Ideiglenes` |
| **Szülő** | [[Mászónapló]] |
| **Kapcsolódó** | [[Nehézségi szint skálája]], [[Nehézségi szint skálája (konverziós mátrix)]], [[Kalóriakalkulátor]], [[Backend-offline first]], [[Backend]] |

### Célállapot

Összevont funkcionális és technikai specifikáció: Mászónapló + intelligens nehézségi parser. **Szét kell választani** a megfelelő admin / napló / skála / kalória fájlokba.

### Funkcionális leírás

#### Köteles mászás (Sport és Trad)

 * Francia skála (French): Számokból, kisbetűkből (a, b, c) és egy opcionális plusz (+) jelből áll (pl. 6a, 6a+, 6b).
 * YDS (Yosemite Decimal System): Mindig 5-össel kezdődik, amit egy pont és a nehézségi fok követ (pl. 5.8, 5.9). 5.10 felett belépnek a kisbetűk: 5.10a–5.10d.
 * UIAA skála: Római számokkal és + / − jelekkel (pl. VI-, VII, VII+).

#### Boulder skálák

 * Fontainebleau (Font): a boulder betűit mindig NAGYBETŰVEL írják (pl. 6A, 6B, 7A). Fizikai nehézségben egy adott boulder fokozat nehezebb, mint az ugyanolyan jelölésű köteles.
 * V-Skála (Hueco): V + szám (pl. V0 … V17).

#### Kontextus-vezérelt működés (Dashboard)

A naplózás indításakor 4 fő kontextus (meghatározza a UI mezőket, validációt, regex mintákat):

 * Indoor Boulder
 * Indoor Kötél
 * Outdoor Boulder
 * Outdoor Kötél

### UI/UX elvárások

Regex Pattern Matching & Pre-parsing — a beírt string + Dashboard kontextus alapján:

Boulder:

 * `^V\d+$` → V-Skála
 * `^\d[A-C]\+?$` → Font

Köteles:

 * `^5\.\d+[a-d]?$` → YDS
 * `^\d[a-c]\+?$` → Francia
 * `^[IVXLCDM]+[-+]?$` → UIAA

UI komponensek és állapotgép: lásd részletesen [[Nehézségi szint skálája]] (ugyanaz a parser / postfix / chip / fallback modell). Röviden:

1. `ion-input` + postfix + suggestion chips
2. 250 ms debounce; állapotok: Üres / Egyértelmű / Kétértelmű / Ismeretlen
3. Mobil pre-parsing: Boulder → NAGYBETŰ; Köteles → kisbetű (UIAA kivételek); trim()

### Megjegyzések

**Architektúra konfliktus:** Az alábbi JPA példák `GenerationType.IDENTITY` + `Long` ID-t használnak, miközben a [[Backend-offline first]] kliensoldali UUID v4-et ír elő. Egységesíteni kell a [[Backend]] specifikációval.

### Nyitott kérdések

- Szétválasztás célfájlokba (admin / napló / skála / kalória)
- UUID migráció a példakódban

## Architektúra

### Frontend

Dashboard 4 kontextus; nehézség parser (fent); kalória / aktív idő becslés pure TypeScript utility-ként is (offline) — a képletek a Backend szekcióban.

### Backend

#### Adatbázis és konfiguráció

 * Grade Mapping Matrix: közös nevező = `absolute_difficulty_index` (Integer). Átváltási mátrix külső JSON-ban, startup betöltés.
 * Adatszétválasztás: Route (master) vs AscentLog (tranzakciós).

#### JPA entity modellek (Java) — példa, UUID-re cserélendő

```java
public enum Discipline { BOULDER, ROPE }
public enum LocationType { INDOOR, OUTDOOR }
public enum SafetyStyle { TOPROPE, LEAD, TRAD }
public enum AscentStyle { ONSIGHT, FLASH, REDPOINT }
public enum WeatherCondition { COLD_DRY, HOT_HUMID, WINDY, WET }
public enum RockType { LIMESTONE, GRANITE, ANDESITE, SANDSTONE, CONGLOMERATE }

@Entity
@Table(name = "routes")
public class Route {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    
    @Enumerated(EnumType.STRING)
    private Discipline discipline;
    
    @Enumerated(EnumType.STRING)
    private LocationType locationType;
    
    private String guidebookGrade; // Eredeti kiírt nehézség (pl. "6a+")
    private Integer absoluteDifficultyIndex; // Normalizált index statisztikákhoz
    
    private String location; // Pl. Oszoly, Buda Boulder
    private String sector;
    
    @Enumerated(EnumType.STRING)
    private RockType rockType; // Csak Outdoor esetén
    
    private String aspect; // Fal fekvése (É, D, K, NY stb.)
    private Integer lengthInMeters; // Út hossza méterben
    private Integer totalPitches; // Kötélhosszak száma (alapértelmezett: 1)
}

@Entity
@Table(name = "ascent_logs")
public class AscentLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long userId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id")
    private Route route; // Opcionális, ha létező útra regisztrálta
    
    @Enumerated(EnumType.STRING)
    private LocationType locationType; // Dashboardról örökölt
    
    @Enumerated(EnumType.STRING)
    private Discipline discipline;     // Dashboardról örökölt
    
    private String userRawInput; // Felhasználó által beírt nyers adat
    private Integer absoluteDifficultyIndex; // A UI/Backend által számolt normalizált index
    
    private Boolean isSuccess; // Sikeres megmászás vagy sikertelen kísérlet
    
    @Enumerated(EnumType.STRING)
    private SafetyStyle safetyStyle; // Toprope, Lead, Trad
    
    @Enumerated(EnumType.STRING)
    private AscentStyle ascentStyle; // Opcionális (csak ha isSuccess == true)
    
    private String failurePoint; // Opcionális (csak ha isSuccess == false, pl. "4. nitt")
    
    private Integer totalSessionDurationMinutes; // Teljes edzésidő percekben
    private Integer calculatedCalories; // Számított elégetett kalória
    
    @ElementCollection
    private List<String> climbingPartners; // Partnerek nevei/ID-jai
    
    @Enumerated(EnumType.STRING)
    private WeatherCondition weatherConditions;
    
    // Szubjektív mutatók (1-5 csúszka)
    private Integer pumpRating;      // Fizikai kimerültség (Kalóriaszámításhoz kötelező)
    private Integer headspaceRating; // Mentális teher / félelem faktor (csak statisztika)
    
    private String notes;
    private LocalDate dateOfAscent;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "ascent_log_id")
    private List<PitchLog> pitches = new ArrayList<>(); // Több kötélhosszas adatok
}

@Entity
@Table(name = "pitch_logs")
public class PitchLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Integer pitchNumber;
    private Boolean isLead; // Elöl mászott (true) vagy Másodmászó (false)
    private String rawGrade;
    private Integer absoluteDifficultyIndex;
    private Integer lengthInMeters;
}
```

#### Kalória- és tiszta mászóidő számítás

A backend a BMR feletti elégetett kalóriát a MET formula kibővített változatával számolja. Két zóna: Aktív mászóidő és Teremi üresjárat.

Tiszta mászóidő (Active Time):

 * Boulder: minden naplózott kísérlet fixen 60 másodperc aktív idő.
 * Kötél: `lengthInMeters` + `safetyStyle`:
   * Toprope: 25 s / m
   * Lead: 45 s / m
   * Trad: 60 s / m

MET és korrekciók:

 * Aktív bázis: Boulder = 8.0, Kötél = 7.0
 * `pumpRating` (1–5): 1 → ×0.8; 3 → ×1.0; 5 → ×1.3
 * Rest Time: fix 2.0 MET (NEAT / biztosítás / tisztítás)
 * Trad: testsúly +6 kg hardver a [[Profile]] testsúlyához

Kapcsolat: [[Kalóriakalkulátor]].

### Nyitott kérdések

- OpenAPI sémák UUID-vel a fenti entitásokhoz
- Kalória utility paritás frontend ↔ backend
