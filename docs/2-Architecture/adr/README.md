# Architecture Decision Records — this game's own

These are the decisions that belong to **this game and to no other repository** (ADR-0229). They moved here from
`the-inclusionist-docs` — six on 2026-09-23, and ADR-0045, ADR-0060 and ADR-0237 on 2026-09-26 (the Dev: «Sim, mude») —
and records here cite numbers this folder does not have: the ENGINE's decisions and the contract between a cartridge
and the engine live in `the-inclusionist-engine` (ADR-0242), and what belongs to the whole project (pillars, hosting,
licences, process) stays in `the-inclusionist-docs`. The validator finds them when told where to look.

- **Format and rules:** the same YADR shape and the same change rules (erratum or supersession, ADR-0057) as the
  engine's tree; its README is the reference.
- **Validated, not asserted:**
  `python ../the-inclusionist-engine/scripts/validate-adr.py docs/2-Architecture/adr --repo engine=../the-inclusionist-engine --repo docs=../the-inclusionist-docs --root=.`
  Without the `--repo` roots every citation of a record that lives elsewhere FAILS, on purpose: a citation nobody can
  resolve is not «not checked», it is a number that may be wrong.
- **Where a record lives is a triage, not a count:** `the-inclusionist-engine/docs/2-Architecture/record-ownership-triage.md`.

| ADR | Decision | Status |
|---|---|---|
| [ADR-0016](ADR-0016-city-scenario-and-themes.yaml) | City scenario & theme decisions | accepted |
| [ADR-0041](ADR-0041-the-letter-grid-splits-mechanics-from-screen.yaml) | The letter grid splits — MECHANICS in `core/`, SCREEN in `ui/` — because it is text entry without a keyboard, not a password widget | accepted |
| [ADR-0042](ADR-0042-the-city-parallax-is-generated-art-not-a-copy.yaml) | The City parallax is REDRAWN as a generated skyline, not reproduced — the three backdrops are hand-drawn art, not geometry | accepted |
| [ADR-0045](ADR-0045-the-run-button-becomes-a-latch-and-its-other-jobs-move-to-the-jump.yaml) | **The RUN button becomes a latch, and every other job it had moves to the JUMP in context.** ⚠️ **SUPERSEDED by ADR-0060**, and the title is the reason the supersession is whole: it states exactly the half the Dev revoked on 28/08 ("desfaço o que pedi"), and a pointer inside the file does not reach whoever reads only the index. What still stands, and what the successor does not repeat: the MEASUREMENT of what the Run edge used to trigger, and the cane argument — `easy` and `toggleMove` switch off RUNNING, they never switch off TOUCHING | **superseded by ADR-0060** |
| [ADR-0060](ADR-0060-the-interaction-button-keeps-every-job-and-only-running-becomes-a-latch.yaml) | **The INTERACTION button keeps all of its jobs, in ALL input modes** — and only RUNNING becomes a latch, because only running requires holding down. Running is a STATE, interacting is an EVENT: that is why they share the button without competing. The button acts BY CONTEXT — a wall with a suction cup is STICK, near an object is PICK UP, holding with a direction is THROW, with no context it toggles running. **The jump never sticks and never picks anything up.** ⚠️ And ADR-0045 §3 and §4 still described `pularVaiGrudar` and `botaoDeGrude` as the decision in force — both functions had been DELETED from the code on 28/08, with both revocations cited in the file itself. A wrong record in public for a week, which is the defect CLAUDE.md names in one line. What survives is what cost 0045 the most: the TWO QUESTIONS (`botaoDeCorrerEngatado` × `correndoAgora`), because the cane asks the first | accepted |
| [ADR-0061](ADR-0061-the-no-littering-sign-bars-the-child-and-its-position-is-level-data.yaml) | The no-littering sign bars the CHILD, not the litter, and where it stands is level data, never derived | accepted |
| [ADR-0062](ADR-0062-the-tenth-coin-closes-a-lap-and-the-lap-restarts-itself.yaml) | The tenth coin closes a LAP, and the lap restarts itself — nothing the child built goes with it | accepted |
| [ADR-0174](ADR-0174-the-platformer-s-title-menu-and-its-dictionary-keys-leave-the-engine.yaml) | The platformer's title menu and the dictionary keys only it uses leave the engine | accepted |
| [ADR-0237](ADR-0237-a-sub-engine-for-top-down-and-platformer-games.yaml) | **A sub-engine for top-down and platformer games — born as a separable folder in the platformer.** 📌 Accepted 25/09 («Aceito a ideia»): the package is extracted when a top-down game uses it. 📌 The Dev, 25/09: points and powers «só funciona em jogos top-down e plataforma. Creio ser melhor desenvolver uma "subengine" que funciona especificamente para estes dois gêneros.» 📌 Errata 25/09 («Eu pretendo fazer 4 plataformers»): two shared layers — a world core for both genres (tile map, camera, basic collision, points and powers, interactables) and a platformer layer every platformer shares (parallax, gravity, slopes, ladders, platformer physics); extracted when the second game of either genre starts. | accepted |
