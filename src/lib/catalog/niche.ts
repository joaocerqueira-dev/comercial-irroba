/** Detecção de nicho compartilhada entre architect (blueprint) e compiler (variações). */
const FOOTWEAR_RE =
  /\b(bota|botas|coturno|coturnos|creeper|creepers|tenis|tênis|sapato|sapatos|sandalia|sandália|sandalias|sandálias|calcado|calçado|calcados|calçados|mocassim|salto|chuteira|chinelo|sneaker)\b/i;
const APPAREL_RE =
  /\b(moda|vestuário|vestuario|roupa|roupas|vestido|vestidos|camisa|camisas|camiseta|camisetas|blusa|blusas|blazer|blazers|calça|calças|calca|calcas|body|saia|saias|jaqueta|short|shorts)\b/i;

export function isFootwearText(text: string): boolean {
  return FOOTWEAR_RE.test(text);
}

export function isApparelText(text: string): boolean {
  return APPAREL_RE.test(text);
}
