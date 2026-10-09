# 0003 — Representar valores monetários como string decimal

- **Status:** Aceito
- **Data:** 2026-10-09

## Contexto

Valores monetários (preço de referência, valor contratado, pagamentos, reembolsos,
despesas) são armazenados como `NUMERIC(12,2)` (DD13).

No JavaScript, `number` é ponto flutuante binário (IEEE 754) e não representa com
exatidão a maioria das frações decimais:

```js
0.1 + 0.2 // 0.30000000000000004
```

Em dinheiro, esse erro se acumula em somas de parcelas e cálculos de saldo, e pode
gerar diferenças de centavos.

O driver `pg` já devolve colunas `NUMERIC` como **string** (`"1500.00"`)
justamente para não perder precisão.

## Decisão

- Na API, nos DTOs, no domínio e nas entities, valores monetários são **string
  decimal** com até 2 casas (ex.: `"1500.00"`).
- A entrada é validada com `@Matches(/^\d{1,10}(\.\d{1,2})?$/)`: até 10 dígitos
  inteiros e 2 decimais, espelhando `NUMERIC(12,2)`.
- **Cálculos** (saldo, totais, resultado financeiro) são feitos em **centavos
  inteiros**, por funções utilitárias dedicadas e testadas. Nunca somando strings
  nem convertendo para `number` com casas decimais.

## Opções consideradas

- **`number`**: simples, mas impreciso. Descartado.
- **Inteiro em centavos na API** (padrão de alguns gateways de pagamento): exato,
  mas menos legível para quem consome a API e diferente do formato do banco.
- **String decimal**: exata, legível e igual ao formato do banco. Escolhida.
- **Biblioteca decimal** (ex.: decimal.js): poderá ser adotada nas funções de
  cálculo se a complexidade crescer, sem mudar o formato da API.

## Consequências

- Nenhuma perda de precisão entre API, aplicação e banco.
- O cliente da API envia e recebe valores como string.
- Operações aritméticas exigem as funções utilitárias, o que será tratado na
  implementação de `Payment`.
- Ordenação ou comparação de valores não pode ser feita como string; deve usar o
  banco (`ORDER BY`) ou a conversão para centavos.
