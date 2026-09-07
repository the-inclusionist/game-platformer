# Plano de cenário — CIDADE (tilemap 16×16 + vida ambiente)

> Objetivo: substituir os "blocos horríveis" por uma cidade vertical coerente.
> Regra de custo: **tudo 1-direção (sidescroller)**, nunca 8 direções. Orçamento estimado ~46 gerações para a cidade inteira.

## 1. Conceito: cidade VERTICAL
O mapa (56×62 tiles) é lido por faixas de altura:

| Zona | Faixa (Y, a calibrar) | Piso/estrutura | Vida | Decoração |
|---|---|---|---|---|
| **Telhado** (alto) | topo | laje + platibanda | só **gatos + pombos** | caixas d'água, letreiros/outdoors, antenas, **lâmpadas pendentes**, ar-cond. — **sem árvores** |
| **Prédio** (meio) | meio | fachada/parede | quase nenhuma | janelas, canos, escada de incêndio |
| **Rua** (baixo) | base | **calçada + meio-fio** | adultos, cães, gatos, **pombos** | árvores urbanas, postes, **placas de trânsito**, toldos/bancas de loja, hidrante, lixeira, banco |
| **Secreta** (`darkRegions`) | bolsões escuros | **interior de construção abandonada** | nenhuma | entulho, viga exposta, cano quebrado, lâmpada quebrada, pichação |

- **Água = interior de caixa d'água**: paredes de tanque (metal/concreto) + linha d'água. Coerência: as caixas d'água ficam **nos telhados** — você nada dentro delas.
- **Letreiros e lâmpadas = decoração** com brilho suave.

## 2. Mapeamento às camadas (já existentes + 1 nova)
1. **C1 gameplay** (`worldToTexture`): tiles por zona (calçada/parede/laje/tanque/abandonado).
2. **decoLayer** (atrás do player, sem colisão): props por zona.
3. **NOVA camada "vida"** (entre deco e player, sem colisão): criaturas animadas.
4. **C2/C3/C4 parallax**: lojas+letreiros / prédios médios / skyline.
5. **darkLayer** (escuridão das secretas) — já existe.

## 3. Tilesets 16×16 a gerar (`create_sidescroller_tileset`, base encadeada p/ consistência)
1. **Calçada** — concreto claro + meio-fio (topo = borda de calçada).
2. **Fachada de prédio** — parede estrutural (meio).
3. **Laje/telhado** — superfície + platibanda na borda.
4. **Caixa d'água** — parede interna do tanque + linha d'água (reskin do tile água, tipo 3).
5. **Interior abandonado** — concreto rachado/tijolo exposto/entulho (zonas secretas).
- **Reskins de gameplay** mantêm forma/contraste reconhecíveis (legibilidade AAA): escada→escada de incêndio metálica; moeda, perigo, trampolim, portão, chave **inalterados em leitura**.

## 4. Props (`create_1_direction_object`, view sidescroller, 1 dir, espelhável)
- **Rua**: árvore urbana, poste de luz, placa de trânsito (faixa/pare/semáforo), toldo/banca de loja, hidrante, lixeira, banco.
- **Telhado**: caixa d'água (prop grande), letreiro/outdoor, antena, lâmpada pendente, ar-condicionado.
- **Abandonado**: entulho, viga, cano quebrado, lâmpada quebrada.
- Lâmpadas/letreiros: **brilho estável** (sem piscar — WCAG 2.3.1, < 3 Hz).

## 5. Vida ambiente (criaturas) — comportamentos
- **Rua**: pombos (andam/bicam; **voam ao se aproximar** e pousam adiante), gatos (andam), cães (andam), adultos (andam ao fundo, recuados/dessaturados).
- **Telhado**: **só gatos + pombos**.
- **Pombo (juice)**: raio de aproximação do player → debanda pra cima e repousa. **Puramente cosmético**: sem colisão, sem dano, **distinto do "susto" de perigo (E3)**.
- Sprites 1-direção, 2 quadros, espelhados por sentido.

## 6. Acessibilidade & desempenho (melhorias minhas)
- **Toggle "Vida & animação de fundo"** + respeito a `prefers-reduced-motion`: desliga voo de pombos e reduz animações ambientes (autismo/TDAH/vestibular). Liga por padrão só se não houver reduce-motion.
- **Sem flashes**: letreiros/lâmpadas com brilho constante.
- **Contraste/leitura**: criaturas e decoração **recuadas e atrás do player**, paleta separada de moeda (amarelo)/perigo (vermelho)/player; nunca confundíveis com plataforma.
- **Desempenho** (hardware escolar): pool de criaturas, **spawn só perto da câmera**, limite por tela, 2 quadros; tudo cosmético → cortável sem afetar o jogo (graceful degradation por FPS).
- **Não colidível**: nada de prop/criatura vira "chão" ou "inimigo" acidental.

## 7. Correções às ideias originais
- **Placa de trânsito no telhado não faz sentido** → no alto uso **letreiros/outdoors/antenas** (sinalização de prédio); placas de trânsito ficam **na rua**. (Você já separou rua=trânsito / alto=sinalização; aqui fica definido.)
- **Pombo voando = cosmético**, nunca o susto de perigo (sem dano/respawn).
- **Caixa d'água nos telhados** amarra "água = interior de caixa d'água" à verticalidade.

## 8. Orçamento de geração (1-direção)
| Item | Qtd | ~Gerações |
|---|---|---|
| Tilesets | 5 | ~15 |
| Props | ~16 | ~16 |
| Criaturas | ~6 (×~2 quadros) | ~12 |
| Parallax (refino lojas/letreiros) | 3 | ~3 |
| **Total** | | **~46** |

Comparação: o personagem 8-direcional desperdiçou ~540. Aqui, **a cidade rica inteira ≈ 46**.

## 9. Ordem de execução (rodadas, com aval visual entre cada)
- **A** — Tilesets (calçada/fachada/laje/tanque/abandonado) + wire por zona.
- **B** — Props por zona (decoLayer).
- **C** — Criaturas + sistema de vida ambiente + toggle de acessibilidade.
- **D** — Refino do parallax (lojas com letreiros na camada próxima).

---

# REVISÃO FINAL (alinhado) — substitui pontos acima onde divergir

## Filosofia: procedural-first como redução de carga cognitiva
Sprite PixelLab = **andaime** para criar. José corrige/adequa cada imagem e a abstração é
**transformada em geração procedural** em seguida. Gerar imagem só quando procedural não resolve.

## Vertical REAL do mapa (corrigido — NÃO há telhado)
- **Base = rua** (calçada, lojas/letreiros no parallax, vida de rua).
- **Caixa d'água**: o corpo d'água fica na **base**, mas a **entrada é no alto** (parede alta após o trampolim). Tiles de água = interior de tanque.
- **Acima da altura da entrada da caixa d'água = interior de prédio.**
- **Secretas (`darkRegions`) = interior de construção abandonada.**
- **Lava**: não combina; deixada intacta por ora (José resolve depois).

## Tilesets (4, Rodada A — gerados): calçada · interior de prédio · caixa d'água · interior abandonado
(O genérico "concreto" anterior é aposentado.)

## Camadas (atualizado) — agora com FRENTE
1. Parallax fundo: C4 céu · C3 prédios médios · C2 lojas+letreiros **+ adultos em silhueta**.
2. C1 gameplay: tileset por zona + itens + player + **vida no plano (adultos/cães/gatos/pombos) atrás do player**.
3. **NOVA camada FRENTE (à frente do player): CARROS** passando de vez em quando.
4. **Clima** (chuva) overlay, abaixo do HUD.

## Mecânicas novas (todas procedurais, 0 crédito)
- **Carros**: surgem esporádicos, cruzam a rua na camada da frente; **param no vermelho do semáforo**, seguem no verde.
- **Semáforo funcional**: ciclo verde→amarelo→vermelho; governa os carros.
- **Adultos**: silhuetas no parallax **e** pedestres andando no plano (atrás do player).
- **Pombos**: andam/bicam; **revoam ao se aproximar** (cosmético, sem dano).
- **Chuva (rotina)**: inicia aos **30s**; ciclo `garoa 5s → chuva 5s → garoa 5s → bom 45s` (60s) em loop. Respeita `prefers-reduced-motion`/toggle.

## Orçamento revisado
- **Rodada A: 4 tilesets ≈ 12 gerações** (única geração desta etapa).
- Props/criaturas-herói (caixa d'água, gato, cão, adulto, placa, carro): poucas, 1-direção.
- Ambiente (pombos, névoa, nuvens, chuva, semáforo, carros) = **procedural, 0 crédito**.
- Total cidade ≈ **20–25 gerações**.
