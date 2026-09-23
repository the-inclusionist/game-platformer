# Architecture Decision Records — this game's own

These are the decisions that belong to **this game and to no other repository** (ADR-0229). They moved here from
`the-inclusionist-docs`, which stays the home of every record that is not one game's: the contract between a
cartridge and the engine, the engine's own decisions, and process, hosting, licences and curriculum. That is why
records here cite numbers this folder does not have — they live there, and the validator finds them when told
where to look.

- **Format and rules:** the same YADR shape and the same change rules (erratum or supersession, ADR-0057) as the
  home tree; its README is the reference.
- **Validated, not asserted:**
  `python ../the-inclusionist-docs/scripts/validate-adr.py docs/2-Architecture/adr --repo docs=../the-inclusionist-docs --repo engine=../the-inclusionist-engine --root=.`
  Without `--repo docs=…` every citation of a home record FAILS, on purpose: a citation nobody can resolve is not
  «not checked», it is a number that may be wrong.
- **Where a record lives is a triage, not a count:** `the-inclusionist-docs/docs/2-Architecture/record-ownership-triage.md`.

| ADR | Decision | Status |
|---|---|---|
| [ADR-0016](ADR-0016-city-scenario-and-themes.yaml) | City scenario & theme decisions | accepted |
| [ADR-0041](ADR-0041-the-letter-grid-splits-mechanics-from-screen.yaml) | The letter grid splits — MECHANICS in `core/`, SCREEN in `ui/` — because it is text entry without a keyboard, not a password widget | accepted |
| [ADR-0042](ADR-0042-the-city-parallax-is-generated-art-not-a-copy.yaml) | The City parallax is REDRAWN as a generated skyline, not reproduced — the three backdrops are hand-drawn art, not geometry | accepted |
| [ADR-0061](ADR-0061-the-no-littering-sign-bars-the-child-and-its-position-is-level-data.yaml) | The no-littering sign bars the CHILD, not the litter, and where it stands is level data, never derived | accepted |
| [ADR-0062](ADR-0062-the-tenth-coin-closes-a-lap-and-the-lap-restarts-itself.yaml) | The tenth coin closes a LAP, and the lap restarts itself — nothing the child built goes with it | accepted |
| [ADR-0174](ADR-0174-the-platformer-s-title-menu-and-its-dictionary-keys-leave-the-engine.yaml) | The platformer's title menu and the dictionary keys only it uses leave the engine | accepted |
