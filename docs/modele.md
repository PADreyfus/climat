# Le modèle

Deux couches, qu'il faut se garder de confondre : un petit **noyau physique** réellement
chiffré, et une **propagation relative** pour tout le reste du graphe.

Tout est dans `src/*.html`, fonction `physics()` pour la première couche et `compute()`
pour la seconde. Aucune donnée n'est chargée depuis l'extérieur : les constantes sont
en dur et documentées ci-dessous.

---

## 1. Le noyau physique (11 cartes)

### Inventaire des émissions

```
fossile = (16·I + 7·B + 10·T + 4·A) · (1 − bas-carbone) / (1 − 0,18)     GtCO₂/an
CO₂     = fossile + 4,5·D + permafrost + feux + amazonie − CCS
autres  = 8·A + 2,5·(fossile/37) + 1,5·I + 0,3·r²                        GtCO₂e/an
```

`I`, `B`, `T`, `A`, `D` sont les curseurs (industrie, bâtiments, transport, agriculture,
déforestation), à 1,0 au repos. `r = ΔT / 2,75` mesure l'emballement des rétroactions.

| Constante | Valeur | Origine |
|---|---|---|
| Répartition sectorielle du fossile | 16 / 7 / 10 / 4 GtCO₂ | Global Carbon Budget, par usage final (≈ 37 Gt) |
| Usage des sols | 4,5 GtCO₂/an | Global Carbon Budget 2024 (≈ 4,2) |
| Autres GES | ≈ 12,3 GtCO₂e/an | AR6 : ≈ 59 GtCO₂e tous gaz confondus en 2019 |
| Part du bas-carbone au repos | 18 % | part du non-fossile dans l'énergie primaire mondiale |

### Concentration, forçage, température

```
cumul   = CO₂ × 75 ans                     ← hypothèse : ce niveau maintenu jusqu'en 2100
AF      = 0,45 / puits × (1 + 0,12·(CO₂/41,5 − 1))        fraction restant dans l'air
ppm     = 420 + AF · cumul / 7,8
F       = 5,35·ln(ppm/278) + 0,9·(autres/12,3) − 1,0·aérosols + 0,2·albédo    W/m²
ΔT      = 1,4 + 0,45·cumul/1000 + 0,35·(autres/12,3) − 0,4·aérosols            °C
mer     = 0,21 + 0,133·ΔT                                                       m
pH      = 8,05 − 0,000462·(ppm − 420)
budget  = 275 / CO₂                                         années avant 1,5 °C
```

| Constante | Valeur | Origine |
|---|---|---|
| TCRE | 0,45 °C / 1000 GtCO₂ | AR6, valeur centrale (fourchette 0,27–0,63) |
| Masse par ppm | 7,8 GtCO₂ | 2,124 GtC/ppm × 44/12 |
| Fraction restant dans l'air | 0,45 | moyenne observée sur les dernières décennies |
| Forçage du CO₂ | 5,35·ln(C/C₀) | Myhre *et al.*, 1998 |
| Masquage par les aérosols | −0,4 °C | AR6, forçage aérosol net |
| Niveau marin | affine en ΔT | interpolé entre SSP1-1.9 (0,4 m) et SSP5-8.5 (0,8 m) en 2100 |
| pH | affine en ppm | interpolé entre SSP1-2.6 et SSP5-8.5 |
| Budget 1,5 °C | 275 GtCO₂ | AR6 actualisé, ordre de grandeur |

### Les rétroactions et le point fixe

Le permafrost dépend de ΔT, qui dépend des émissions, qui dépendent du permafrost : le
système est implicite. Il est résolu par **80 itérations amorties** (pas de 0,4), ce qui
converge largement.

```
permafrost = 0,5 · r²      GtCO₂/an        feux = 0,3 · r²
amazonie   = 0,25 · r² · D                 albédo = r^1,2   (+0,2 W/m² au repos)
```

Ce sont les coefficients les plus faibles du modèle : des **paramétrisations d'ordre de
grandeur**, choisies pour que la contribution actuelle soit crédible et la croissance
superlinéaire. Elles ne sont pas ajustées sur un modèle publié.

### Calibration

Tous les curseurs au repos, le modèle donne :

| | Modèle | Repère |
|---|---|---|
| Réchauffement 2100 | +2,79 °C | politiques actuelles : ≈ +2,7 °C |
| CO₂ atmosphérique | 605 ppm | SSP2-4.5 : ≈ 600 ppm |
| Émissions | 42,7 GtCO₂/an | 41,5 anthropiques + rétroactions |
| Niveau marin | +58 cm | SSP2-4.5 : ≈ 55 cm |
| pH de l'océan | 7,96 | ≈ 8,05 aujourd'hui |
| Budget 1,5 °C | 6,4 ans | épuisé vers 2031 |

Cet état est la **trajectoire actuelle**, celle que le simulateur affiche au chargement.
Ce n'est **pas** la référence des pourcentages.

### La référence des pourcentages : une trajectoire tenue (+1,7 °C)

Les indices se comptent depuis `TRAJREF` : le préréglage « Neutralité » **sans captage**,
qui atterrit à **+1,67 °C**, 3,7 GtCO₂/an nets, 431 ppm. `refIdx()` rejoue `compute()` sur
ces réglages, et chaque indice affiché est divisé par le sien.

Le captage est retiré délibérément. Avec les 5 Gt/an du préréglage, le CO₂ net tombe à
zéro, et cinq cartes valent alors exactement 0 — émissions, puits, acidification,
calcification, ptéropodes. On ne peut pas diviser par elles : deux cartes propagées en aval
affichaient −100 %. `TRAJREF` est la trajectoire la plus basse que le modèle exprime sans
dégénérer.

Prendre la trajectoire actuelle comme référence revenait à la comparer à elle-même : les
52 cartes affichaient 0 %, et ne rien faire semblait ne rien coûter. Depuis une trajectoire
1,5 °C, « Actuel » dit ce que la trajectoire actuelle coûte déjà — +280 % de risque de
famine, +170 % de crise économique, et ainsi de suite sur les 52 cartes.

La référence doit traverser **le même pipeline que l'état affiché**. Ce n'est pas un
détail : sur la trajectoire actuelle (+2,79 °C), quatre seuils de bascule sont franchis et
leurs multiplicateurs (récifs ×1,5, calottes ×1,25, glaciers ×1,3) s'appliquent à l'état
affiché. Une référence calculée sans eux produisait un écart non nul là où il devait être
nul : les cartes ont un temps annoncé « +50 % biodiversité marine » sans qu'on ait touché à
quoi que ce soit — un artefact de normalisation, pas une prévision.

**Vérification** : réglé sur `TRAJREF`, le plateau affiche exactement 0 % sur les 52 cartes.

Ces pourcentages restent **ordinaux**, et les exposants γ les composent le long de la
chaîne. Ils classent les scénarios entre eux ; ils ne se lisent pas comme des
multiplicateurs de risque.

---

## 2. La propagation dans le graphe (35 cartes)

« Intensité des sécheresses » n'a pas d'unité. Chaque carte non physique porte donc un
**indice**, 1 = trajectoire tenue (+1,7 °C) :

```
idx(carte) = ( Σ wᵢ · idx(parentᵢ) / Σ wᵢ ) ^ γ
```

- **`w`** (0,3 à 1) dit quelle cause pèse le plus. *Jugements éditoriaux, pas des
  coefficients mesurés.* Les sécheresses tiennent à 1,0 du cycle de l'eau et à 0,5 de la
  température ; les rendements agricoles à 1,0 des sécheresses et à 0,4 des crues.
- **`γ`** encode la non-linéarité : 2,2 canicules, 2,0 incendies, 1,8 submersions,
  famines et conflits, 1,0 par défaut. Traduction grossière d'un fait réel — +1 °C sur la
  moyenne multiplie par 5 à 10 la fréquence des extrêmes.
- Une flèche marquée `neg` (les aérosols) inverse la valeur par `2 − v` : une symétrie
  autour de 1, simple et fausse loin de la référence.
- **11 cartes sont ancrées** : au lieu d'être propagées, elles reçoivent directement la
  valeur physique de la couche 1. Le graphe n'invente donc rien en amont, il redistribue
  en aval.

60 itérations suffisent à refermer les boucles. À la référence, tous les indices valent
exactement 1 — une moyenne pondérée de 1 vaut 1 — ce qui garantit qu'un pourcentage
affiché est bien dû au curseur et non au modèle.

---

## 3. Les seuils de bascule

Le modèle est **sans mémoire** : il calcule un équilibre à partir de la position des
curseurs, et reculer un curseur ramène exactement à l'état d'avant. Les seuils de bascule
ne font pas exception — ils décrivent le réglage affiché, et se rouvrent quand on
redescend.

Franchir un seuil impose des planchers qui réchauffent un peu plus, ce qui peut en
franchir d'autres : l'ensemble est donc résolu **par point fixe**. On part sans plancher,
donc au ΔT le plus bas, et un plancher ne peut qu'ajouter des seuils — la suite est
monotone et converge en au plus six passes. Le résultat ne dépend pas du chemin parcouru.

| Seuil | Température | Effet dans le modèle tant qu'il est franchi |
|---|---|---|
| Récifs coralliens | 1,5 °C | × 1,5 sur la biodiversité marine |
| Calottes polaires | 1,5 °C | × 1,25 — l'essentiel de l'engagement est post-2100 |
| Permafrost | 1,5 °C | plancher de 0,9 GtCO₂e/an sur le dégel |
| Glaciers de montagne | 2,0 °C | × 1,3 |
| Forêt amazonienne | 3,5 °C | plancher de 0,6 GtCO₂/an |
| Circulation atlantique | 4,0 °C | × 1,6 |

Seuils : valeur centrale d'Armstrong McKay *et al.*, *Science*, 2022. **Les fourchettes
sont larges** — 0,8 à 3 °C pour le Groenland, 1,4 à 8 °C pour l'AMOC. Les multiplicateurs, eux,
sont des choix d'auteur : ils traduisent « cet élément reste durablement aggravé », pas
une amplitude mesurée.

### Ce que cela écarte volontairement

Un point de bascule est, dans le monde réel, **irréversible** : une calotte engagée ou un
permafrost en dégel ne se referment pas parce que les émissions baissent ensuite. Le
modèle ne le simule pas. Le cadenas sert à montrer où sont ces portes et ce qu'il y a
derrière ; il ne prétend pas retenir qu'on les a franchies.

C'est un choix assumé, au prix d'une infidélité connue : il garde le geste lisible — un
réglage, un résultat, toujours le même — là où une mémoire de session rendait deux
sessions identiques incomparables.

Le bouton ↺ remet simplement les curseurs au plus bas.

### Un piège évité

Les exposants de non-linéarité `γ` se **composent** le long d'une chaîne : appliqués à
chaque maillon de `rendements → famines → déplacements → conflits`, ils donnaient un
exposant total de ≈ 8 et faisaient diverger la boucle `déplacements ↔ conflits` jusqu'à
l'infini dès que les planchers montaient. Les `γ` sont donc réservés aux **extrêmes
physiques** (canicules, incendies, sécheresses, crues, submersions), où la non-linéarité
est un fait mesuré ; la cascade humaine les transmet sans les multiplier. Les
rétroactions (`fb`) sont par ailleurs exclues de la propagation d'indices, puisqu'elles
sont déjà traitées dans la physique.

---

## 4. Ce que le modèle ne fait pas

- **Pas de géographie.** Une moyenne mondiale, pas de cartes régionales.
- **Pas de temps.** Un seul horizon, 2100, sous l'hypothèse explicite d'un niveau
  d'émissions maintenu. Ni trajectoire, ni inertie au-delà.
- **Pas d'adaptation.** Digues, irrigation, sélection variétale, climatisation : rien.
- **Pas de bascule discontinue.** L'AMOC et l'Amazonie sont traitées en continu, alors
  que leur intérêt est justement d'être des seuils.
- **Pas de dose-réponse mesurée** sur les conséquences. Les `w` et les `γ` encodent
  « plus que linéaire » ou « moins que linéaire », rien de plus.

En atelier, le premier usage honnête de cet outil est de faire sentir des ordres de
grandeur et des enchaînements — pas de produire des chiffres à citer.

---

## 5. Sources

Tous les liens ci-dessous ont été vérifiés (code HTTP 200 ou redirection DOI valide).

### Le noyau physique

| Élément du modèle | Source | Lien |
|---|---|---|
| TCRE — 0,45 °C par 1000 GtCO₂ | GIEC AR6, groupe I. Valeur centrale 1,65 °C/1000 PgC, soit 0,45 après conversion (1 PgC = 3,664 GtCO₂) ; fourchette 1,0–2,3 → 0,27–0,63 | <https://www.ipcc.ch/report/ar6/wg1/> |
| Forçage du CO₂ — 5,35·ln(C/C₀) | Myhre, Highwood, Shine & Stordal, *GRL*, 1998 | <https://doi.org/10.1029/98GL01908> |
| Émissions fossiles et usage des sols | Global Carbon Budget | <https://globalcarbonbudget.org/> |
| Fraction restant dans l'air (≈ 45 %) | Global Carbon Budget | <https://globalcarbonbudget.org/> |
| Masse par ppm — 7,8 GtCO₂ | 2,124 GtC/ppm × 44/12 = 7,79 | — |
| Aérosols, niveau marin, pH, autres GES | GIEC AR6, groupe I | <https://www.ipcc.ch/report/ar6/wg1/> |
| Budget 1,5 °C restant | Forster *et al.*, *ESSD*, 2024 — *Indicators of Global Climate Change* | <https://doi.org/10.5194/essd-16-2625-2024> |

### Les seuils de bascule

| Élément | Source | Lien |
|---|---|---|
| Les six seuils et leurs fourchettes | Armstrong McKay *et al.*, *Science*, 2022 | <https://doi.org/10.1126/science.abn7950> |

### Les conséquences chiffrées

| Élément | Source | Lien |
|---|---|---|
| Espèces menacées d'extinction | GIEC AR6, groupe II | <https://www.ipcc.ch/report/ar6/wg2/> |
| Population sous la ligne d'eau (CoastalDEM) | Kulp & Strauss, *Nature Communications*, 2019 | <https://doi.org/10.1038/s41467-019-12808-z> |
| Zone climatique habitable | Xu *et al.*, *PNAS*, 2020 | <https://doi.org/10.1073/pnas.1910114117> |
| Rendements céréaliers | Zhao *et al.*, *PNAS*, 2017 | <https://doi.org/10.1073/pnas.1701762114> |
| Récifs coralliens | GIEC SR1.5 | <https://www.ipcc.ch/sr15/> |
| Déplacements de populations | Banque mondiale, *Groundswell*, 2021 | <https://www.worldbank.org/en/news/press-release/2021/09/13/climate-change-could-force-216-million-people-to-migrate-within-their-own-countries-by-2050> |
| Pollution de l'air | OMS | <https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health> |
| Ville analogue (méthode inspirée de) | Bastin *et al.*, *PLOS One*, 2019 | <https://doi.org/10.1371/journal.pone.0217592> |

### Ce qui n'a pas de source

Les poids des flèches (0,3 à 1), les exposants `γ`, les paramétrisations des rétroactions
et les multiplicateurs des seuils sont des **choix d'auteur**. Ils sont cohérents avec les
ordres de grandeur publiés, ils ne sont tirés d'aucun d'entre eux. Chaque carte le dit
elle-même, dans son bloc « D'où vient ce chiffre ».

### L'atelier

Ce simulateur prolonge l'atelier **[La Fresque du Climat](https://fresqueduclimat.org/)** —
une très bonne formation, vivement recommandée, qu'il ne remplace pas. Projet sans aucun
lien avec l'association.
