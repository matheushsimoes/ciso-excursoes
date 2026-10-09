# 0002 — Representar datas de negócio como string `YYYY-MM-DD`

- **Status:** Aceito
- **Data:** 2026-10-09

## Contexto

O sistema lida com dois tipos de valor temporal:

- **Instantes:** um momento exato no tempo, com hora e fuso.
  Ex.: `createdAt`, `updatedAt`.
- **Datas de calendário (datas de negócio):** um dia, sem hora e sem fuso.
  Ex.: `birthDate`, e no futuro `Excursion.startDate`/`endDate` e a data de um pagamento.

O schema já fazia essa distinção (`TIMESTAMPTZ` para instantes, `DATE` para datas
de negócio), mas o código convertia `birthDate` para `Date` do JavaScript, que é
sempre um instante. Isso causou dois problemas:

1. **Formato inconsistente na API.** O mesmo campo saía em dois formatos:

   | Endpoint | Origem do valor | Resposta |
   |---|---|---|
   | `POST /persons` | `new Date('1990-05-10')` no service | `"1990-05-10T00:00:00.000Z"` |
   | `GET /persons/:id` | coluna `DATE` lida pelo TypeORM | `"1990-05-10"` |

2. **Risco de erro de fuso horário.** `new Date('1990-05-10')` representa meia-noite
   UTC, que em Brasília (UTC-3) é **9 de maio, 21h**. Qualquer formatação em horário
   local (relatório, frontend, exportação para seguro) mostraria a data de
   nascimento um dia antes.

Os testes E2E usavam `birthDate: expect.any(String)`, o que escondia o problema.

## Decisão

- **Datas de negócio** são representadas como **string no formato `YYYY-MM-DD`** em
  todas as camadas (DTO, domínio, entity) e persistidas em colunas `DATE`.
  Nunca são convertidas para `Date`.
- **Instantes** continuam como `Date` no código e `TIMESTAMPTZ` no banco.
- A entrada é validada no DTO com `@Matches(/^\d{4}-\d{2}-\d{2}$/)` (formato) e
  `@IsISO8601({ strict: true })` (data existente).

## Consequências

### Positivas
- A API devolve o mesmo formato em todos os endpoints.
- Não há conversão de fuso: o dia informado é o dia gravado e o dia devolvido.
- O tipo no código descreve o que o banco realmente devolve: o TypeORM já
  retorna colunas `DATE` como string.
- Os testes E2E validam o valor exato, e uma regressão de formato passa a falhar.

### Negativas / pontos de atenção
- Cálculos com datas (idade, duração da excursão, comparação de datas) não podem
  usar a aritmética de `Date` diretamente. Comparações entre strings `YYYY-MM-DD`
  funcionam por ordem lexicográfica. Cálculos mais complexos devem ficar em funções
  utilitárias dedicadas e testadas.
- A string não carrega garantia de tipo: o compilador não impede passar uma string
  qualquer. A garantia vem da validação na entrada. Se isso virar problema, a
  evolução natural é um *value object* (ex.: `BusinessDate`).

### Escopo
Esta convenção vale para todas as datas de negócio futuras, como as datas de
`Excursion` e `Payment`.
