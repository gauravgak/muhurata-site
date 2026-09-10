# Tarot card images

Drop the card art here and it shows up on the Tarot section — **no code
change needed**. Until then the cards render a fallback face (the card
name in the serif on a warm ground) and the flip animation still works.

- **Format:** PNG (or change `CARDS_BASE` in `config.js` and the CSS
  `--tr-back` to `.jpg`).
- **Aspect:** ~1 : 1.66 (standard tarot, e.g. 500 × 830 px). Same size for
  every card so the flip looks right.
- **Names:** exactly the slugs below (lowercase, hyphens).

## Files (79)

`back.png` — the card back, shown face-down.

### Major arcana (22)
the-fool, the-magician, the-high-priestess, the-empress, the-emperor,
the-hierophant, the-lovers, the-chariot, strength, the-hermit,
wheel-of-fortune, justice, the-hanged-man, death, temperance, the-devil,
the-tower, the-star, the-moon, the-sun, judgement, the-world

### Minor arcana (56)
ace / two / three / four / five / six / seven / eight / nine / ten /
page / knight / queen / king — each **of-wands**, **of-cups**,
**of-swords**, **of-pentacles**.

e.g. `ace-of-wands.png`, `two-of-cups.png`, `king-of-pentacles.png`.
