# Padrões de geração de layout

Todos os layouts gerados seguem os padrões abaixo. Altere aqui e o resultado muda para todas as lojas.
O teste `src/lib/__tests__/layout-patterns-golden.test.ts` congela a saída: mudanças intencionais exigem `npx vitest run -u`.

| Módulo | O que define | Onde é aplicado |
|---|---|---|
| `palette.ts` | cores de fallback, proporções de escurecer/clarear, limiares de luminância e contraste | `ai/color-utils.ts`, `ai/architect.ts`, `irroba-blocks/compiler.ts`, `irroba-blocks/sanitize.ts` |
| `layout.ts` | container de 1280px, buckets de raio e CSS, limites de itens por seção, defaults do header e do card | `architect.ts`, `compiler.ts` |
| `typography.ts` | pares de fontes, regra tom → par, fontes de sistema, fallbacks, regex de serifa | `architect.ts`, `compiler.ts`, `sanitize.ts` |
| `copy.ts` | textos padrão, regex de títulos de seção, imagens placeholder | `architect.ts`, `compiler.ts` |
| `ai.ts` | modelos Gemini, temperatura, timeout | `architect.ts`, `image-studio.ts`, `api/previews/generate/route.ts` |

Ordem das seções e defaults do schema continuam em `src/lib/types/blueprint.ts` (`DEFAULT_SECTION_LAYOUT` e `.default()` do Zod).

## Ainda não centralizado
- Regras de slot de banner e tamanho mínimo de CTA (`scraper/store-extractor.ts`): rodam dentro de `page.evaluate` e só aceitam valores serializados. Para centralizar, passar as constantes como argumento do evaluate.
- Enum de paddings no prompt do Gemini.
- Regex "não vestuário" duplicada em `architect.ts` e `compiler.ts`.
- Cores literais dentro do CSS grande do compiler (`color: #111827` etc.).

## Regras de comportamento
- Fontes: o par é escolhido pelo nicho do texto da loja (`FONT_PAIRINGS[*].niches`, prioridade em `FONT_PAIRING_PRIORITY`). Sem nicho reconhecido, vale o tom (`TONE_FONT_PAIRING`). A IA só pode sugerir fontes de `ALLOWED_FONTS`, a mesma lista do Studio.
- Cor do texto: heurística e Gemini usam `ensureReadableForeground`, que mantém a cor da loja se o contraste for de pelo menos 4.5:1.
- Selo da faixa promocional: único, `DEFAULT_COPY.slimBadge`.
- Depoimentos gerados ficam com `testimonialsIllustrative: true`, e a vitrine mostra um aviso.
