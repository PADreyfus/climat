# Le modèle

Deux couches, qu'il faut se garder de confondre : un petit **noyau physique** réellement
chiffré, et une **propagation relative** pour tout le reste de la fresque.

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
| Émissions | 42,6 GtCO₂/an | 41,5 anthropiques + rétroactions |
| Niveau marin | +58 cm | SSP2-4.5 : ≈ 55 cm |
| pH de l'océan | 7,96 | ≈ 8,05 aujourd'hui |
| Budget 1,5 °C | 6 ans | épuisé vers 2030 |

C'est cet état qui sert de **référence** : tous les pourcentages de la fresque s'y
comparent, et il est recalculé au chargement plutôt que codé en dur, pour que l'écart
affiché soit exactement nul quand on ne touche à rien.

---

## 2. La propagation dans le graphe (35 cartes)

« Intensité des sécheresses » n'a pas d'unité. Chaque carte non physique porte donc un
**indice**, 1 = trajectoire actuelle :

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

## 3. Les verrous (édition épurée)

Le modèle décrit plus haut est **sans mémoire** : il calcule un équilibre à partir de la
position des curseurs, donc reculer un curseur ramène exactement à l'état d'avant. Les
points de bascule contredisent précisément cela — d'où une couche de mémoire.

L'application retient le **ΔT le plus haut atteint dans la session**. Quand ce pic
franchit un seuil, l'élément se verrouille, et il ne se déverrouille plus.

| Verrou | Seuil | Effet persistant dans le modèle |
|---|---|---|
| Récifs coralliens | 1,5 °C | plancher d'indice 1,5 sur la biodiversité marine |
| Calottes polaires | 1,5 °C | plancher 1,25 — l'essentiel de l'engagement est post-2100 |
| Permafrost | 1,5 °C | plancher de 0,9 GtCO₂e/an, quelle que soit la température ensuite |
| Glaciers de montagne | 2,0 °C | plancher d'indice 1,3 |
| Forêt amazonienne | 3,5 °C | plancher de 0,6 GtCO₂/an |
| Circulation atlantique | 4,0 °C | plancher d'indice 1,6 |

Seuils : valeur centrale d'Armstrong McKay *et al.*, *Science*, 2022. **Les fourchettes
sont larges** — 0,8 à 3 °C pour le Groenland, 1,4 à 8 °C pour l'AMOC. Les planchers, eux,
sont des choix d'auteur : ils traduisent « on ne redescend plus en dessous », pas une
amplitude mesurée.

Conséquence pédagogique : passez en *Croissance fossile* puis revenez en *Neutralité*,
la température redescend à +1,5 °C, les canicules perdent 73 % — et les famines ne
reculent que de 11 %, parce que ce qui a été cassé ne se répare pas. C'est l'overshoot,
en trois gestes.

Le bouton ↺ remet les curseurs au plus bas **et efface la mémoire**, pour rejouer depuis
un climat où aucun seuil n'est franchi.

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
