> **TODO:** Ez a specifikáció összeömlesztve tartalmaz mindent! Szét kell majd választani a megfelelő specifikációs fájlokba a megfelelő részeket (admin / napló / skála / kalória).
>
> **Architektúra konfliktus:** Az alábbi JPA példák `GenerationType.IDENTITY` + `Long` ID-t használnak, miközben a [[Backend-offline first]] kliensoldali UUID v4-et ír elő. Egységesíteni kell a [[Backend]] specifikációval.

Funkcionális és Technikai Specifikáció: Mászónapló és Intelligens Nehézségi Parser
Business
Köteles mászás (Sport és Trad)
 * Francia skála (French): Számokból, kisbetűkből (a, b, c) és egy opcionális plusz (+) jelből áll (pl. 6a, 6a+, 6b).
 * YDS (Yosemite Decimal System): Mindig 5-össel kezdődik, amit egy pont és a nehézségi fok követ (pl. 5.8, 5.9). 5.10 felett belépnek a kisbetűk pontosításként: 5.10a, 5.10b, 5.10c, 5.10d.
 * UIAA skála: Római számokkal és + / - jelekkel jelölik (pl. VI-, VII, VII+).
Boulder skálák
 * Fontainebleau (Font) skála: Hasonlít a francia sportskálára (szám + betű + plusz), de a boulder betűit mindig NAGYBETŰVEL írják (pl. 6A, 6B, 7A). Fizikai nehézségben egy adott boulder fokozat sokkal nehezebb, mint az ugyanolyan jelölésű köteles fokozat.
 * V-Skála (Hueco): Egy V betűből és egy számból áll (pl. V0, V1, V2 ... V17).

Architektúra
Kontextus-vezérelt Működés (Dashboard)
Az alkalmazás már a naplózás indításakor szétválasztja a folyamatot 4 fő kontextusra. A kiválasztott kontextus mereven meghatározza a UI-on megjelenő mezőket, a validációs szabályokat és az engedélyezett Regex mintákat:
 * Indoor Boulder (Beltéri boulder)
 * Indoor Kötél (Beltéri kötél)
 * Outdoor Boulder (Kültéri boulder)
 * Outdoor Kötél (Kültéri kötél)
Regex Pattern Matching & Pre-parsing
A rendszer a beírt string és a Dashboard kontextus alapján automatikusan azonosítja a skálát.
Boulder Kontextusok Mintái:
 * `^V\d+$` -> V-Skála (pl. V3, V10)
 * `^\d[A-C]\+?$` -> Font Skála (pl. 6A, 7B+)
Köteles Kontextusok Mintái:
 * `^5\.\d+[a-d]?$` -> YDS (pl. 5.9, 5.10a)
 * `^\d[a-c]\+?$` -> Francia Skála (pl. 6a+, 7b)
 * `^[IVXLCDM]+[-+]?$` -> UIAA Skála (pl. VI+, VIII-)
UI és működés
1. UI Komponensek és Elrendezés
 * A komponens Input-ként megkapja, hogy: Köteles vagy Boulder.
 * Input Mező: Egy ion-input (type="text").
   * A jobb szélén egy slot="end" attribútummal ellátott postfix gomb (ion-button vagy ion-icon), ami az input aktuális állapotától függően változik.
 * Suggestion Container: Közvetlenül az input mező alatt elhelyezkedő rugalmas konténer, amely dinamikusan jeleníti meg a javaslatokat ion-chip komponensek formájában.
2. Dinamikus Állapotgép (Input-Driven State Machine)
A felhasználó gépelése közben a rendszer 250 ms-os késleltetéssel (debounceTime) elemzi a szöveget, és a következő 4 állapot egyikébe sorolja az inputot:
A) Üres Állapot (Input hossza == 0)
 * Postfix: Nem jelenik meg semmi.
 * Javaslatok: Nincsenek.
 * Validáció: INVALID.
B) Egyértelmű Állapot (A Regex pontosan egy skálára illeszkedik)
 * Postfix: A felismert skála rövidített neve (FRA, YDS, UIAA, V, FONT).
 * Postfix Interakció: Kattintásra egy ion-popover jelenik meg egy rövid, egysoros leírással (pl. "Ez egy francia sportmászó fokozat."). A popover a képernyő mellékattintásával záródik.
 * Javaslatok: Nincsenek.
 * Validáció: VALID.
C) Kétértelmű / Ambiciózus Állapot (A bemenet egy tiszta szám, pl. "4" vagy "6")
 * Postfix: A lehetséges skálák perjellel elválasztva (pl. UIAA / FRA).
 * Postfix Interakció: Kattintásra egy ion-modal (bottom-sheet) nyílik meg, ami elmagyarázza az ütközést és a fallback szabályokat.
 * Javaslatok (Chips): Az input alatt megjelennek a konvertált, szabályos formátumú chipek:
   * Köteles + "6" esetén: VI (UIAA) és 6a (Francia)
   * Köteles + "4" esetén: IV (UIAA) és 4 (Francia)
 * Chip Interakció: A chipre kattintva a rendszer felülírja az input mező tartalmát a pontos formátumra (pl. a 6-ból 6a lesz), és az input azonnal átvált az Egyértelmű Állapotba.
 * Validációs Fallback szabályok (Ha a júzer nem kattint chipre, csak továbblép):
   * Ha a bemenet "6": A validáció INVALID (Franciában kötelező a betű 6 felett).
   * Ha a bemenet "4" (vagy "5"): A validáció VALID. A rendszer alapértelmezetten Francia skálaként menti el a DB-be.
D) Ismeretlen Állapot (A szöveg nem illeszkedik semmire, pl. "xyz")
 * Postfix: Egy kérdőjel ikon (ion-icon - name="help-circle-outline").
 * Postfix Interakció: Kattintásra egy formátum-súgó ion-modal ugrik fel példákkal.
 * Javaslatok: Nincsenek.
 * Validáció: INVALID.
3. Mobil-specifikus Korrekciós Logika (Pre-parsing)
Mielőtt a Regex futna, a háttérben az alábbi transzformációk történnek:
 * Ha a kontextus Boulder, a beírt szöveg automatikusan NAGYBETŰSSÉ alakul (pl. 6a -> 6A).
 * Ha a kontextus Köteles, a betűk (a, b, c) automatikusan kisbetűssé alakulnak (kivéve az I, V, X, L, C, D, M karaktereket a UIAA miatt).
 * A string eleji és végi white-space-ek törlődnek (trim()).
Backend
1. Adatbázis és Konfigurációs Stratégia
 * Grade Mapping Matrix: A skálák közötti átváltás alapja egy közös nevező, az absolute_difficulty_index (Integer). Az átváltási mátrixot egy külső JSON konfigurációs fájl tárolja, ami startup során töltődik be a memóriába (így az új csúcsfokozatok megjelenésekor a rendszer kódmódosítás és újrafordítás nélkül frissíthető).
 * Adatszétválasztás: Különválasztjuk a globális út-adatbázist (Route - Master Data) és a felhasználók egyéni teljesítéseit (AscentLog - Transactional Data).
2. JPA Entity Modellek (Java)
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

3. Kalória- és Tiszta Mászóidő Számítási Logika
A backend a felhasználó napi alapenergia-felhasználásán (BMR) felül elégetett kalóriát a MET (Metabolic Equivalent of Task) formula kibővített változatával számolja ki. Az algoritmus két zónára osztja az edzést: Aktív mászóidő és Teremi üresjárat (pihenés/biztosítás).
A tiszta mászóidő (Active Time) becslése:
 * Boulder: Minden egyes naplózott kísérlet (függetlenül a sikertől) fixen 60 másodperc aktív időnek számít.
 * Kötél (Rope): Az aktív időt az út hossza (lengthInMeters) és a safetyStyle határozza meg:
   * Toprope: 25 másodperc / méter.
   * Lead (Elölmászás): 45 másodperc / méter (akasztások miatti időkiesés).
   * Trad: 60 másodperc / méter (eszközök elhelyezése/kiszedése miatt).
MET Értékek és Korrekciós Tényezők:
 * Aktív zóna bázis MET értékei: Boulder = 8.0, Kötél = 7.0.
 * Intenzitás korrekció (EPOC és anaerob adósság): A tiszta mászóidő alatti MET értéket a felhasználó által megadott pumpRating (1-5 csúszka) skálázza fel:
   * pumpRating == 1 -> Bázis MET \times 0.8
   * pumpRating == 3 -> Bázis MET \times 1.0 (Standard nehézség)
   * pumpRating == 5 -> Bázis MET \times 1.3 (Maximális bedurranás, magas utólagos oxigénfogyasztás)
 * Teremi üresjárat (Rest Time):
   
   
   A mászóteremben vagy szikla alatt töltött passzív időre a rendszer fix 2.0-es MET szorzót alkalmaz (figyelembe véve a NEAT-et: sétálás a falak között, fogások tisztítása, társ biztosítása és az edzés utáni megemelkedett pulzus), ami lényegesen magasabb, mint a Home Office ülőmunka (1.3 MET).
 * Trad Extra Súly korrekció: Ha a stílus TRAD, a rendszer a felhasználó profiljában tárolt testsúlyhoz automatikusan hozzáad +6 kg hardver-súlyt a mechanikai munka kiszámításakor.
