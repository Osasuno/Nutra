// Chaves locais para listas editáveis (não usa crypto.randomUUID, que exige HTTPS).
let seq = 0;

export function newKey(): string {
  seq += 1;
  return `k${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
