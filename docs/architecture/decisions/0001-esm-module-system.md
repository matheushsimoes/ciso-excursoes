# 0001 — Usar ESM como sistema de módulos do backend

- **Status:** Aceito
- **Data:** 2026-10-08

## Contexto

O backend (NestJS + TypeORM + Jest + ts-jest) estava com a configuração de
módulos inconsistente:

- `package.json` com `"type": "module"` e `tsconfig` com `module: nodenext`,
  ou seja, o projeto já era ESM;
- parte dos imports relativos tinha extensão `.js` e parte não tinha;
- um `moduleNameMapper` no Jest fazia as duas formas funcionarem nos testes,
  escondendo a inconsistência. Fora dos testes, os imports sem `.js` quebrariam
  em runtime.

O plano anterior era migrar para CommonJS para ter imports sem extensão e
remover a flag `--experimental-vm-modules` dos scripts de teste.

Durante a análise descobrimos que **o NestJS 12 é distribuído apenas como ESM**:
`@nestjs/core`, `@nestjs/common`, `@nestjs/testing` e `@nestjs/typeorm` declaram
`"type": "module"` e não oferecem uma entrada CommonJS. Qualquer que fosse o
modelo do nosso código, o framework continuaria sendo ESM.

## Evidências

Experimentos executados em Node v24.11.1, Jest 30, NestJS 12.1.

| # | Cenário | Comando | Resultado |
|---|---|---|---|
| 1 | Node puro, `require` do Nest a partir de CommonJS | `node -e "const c = require('@nestjs/core'); console.log(typeof c.NestFactory)"` | ✅ `object` (require(esm) nativo do Node) |
| 2 | Jest em modo CommonJS, sem flag | `npx jest --config '{}' --rootDir esm-check --testRegex 'nest\.test\.cjs$'` | ❌ `Must use import to load ES Module` |
| 3 | Jest com a flag | `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config '{}' --rootDir esm-check --testRegex 'nest\.test\.cjs$'` | ✅ passa |

Conclusões:

- O runtime do Node consegue carregar o Nest a partir de CommonJS (1), então
  CommonJS **não** quebraria o build nem a execução da aplicação.
- O Jest usa um carregador próprio (`jest-runtime`) e só lida com ESM, via
  `import` ou via `require`, quando o Node é iniciado com
  `--experimental-vm-modules` (2 e 3).
- Portanto, **com NestJS 12 + Jest a flag é obrigatória em qualquer cenário.**
  A principal motivação para migrar para CommonJS deixa de existir.

## Opções consideradas

### A) ESM completo e consistente
- ✅ Um único modelo de módulos, do nosso código até o framework.
- ✅ Configuração mínima, alinhada à documentação oficial do ts-jest para ESM.
- ⚠️ Imports relativos com `.js` em arquivos `.ts`.
- ⚠️ Depende do suporte experimental do Jest a ESM.

### B) CommonJS, com a flag mesmo assim
- ✅ Imports sem extensão.
- ❌ Dois modelos convivendo por design: nosso código em CJS, o framework em ESM.
- ❌ Depende de `require(esm)` dentro do Jest, que só existe a partir do Node 24.9.
  Ambientes com Node mais antigo quebrariam os testes.
- ❌ Não cumpre o objetivo original de remover a flag.

### C) Substituir Jest por Vitest
- ✅ Suporte nativo a ESM, sem flag.
- ❌ Reverte uma decisão de stack já tomada. Jest é o padrão do ecossistema
  NestJS e o mais pedido no mercado.
- ❌ Custo de migração sem benefício funcional imediato.

## Decisão

Adotar a **opção A: ESM completo e consistente.**

O problema original não era o ESM, era a **mistura** de modelos. ESM aplicado
de forma consistente resolve a causa na raiz, acompanha a direção do framework
(NestJS 12) e mantém build, runtime e testes sob o mesmo modelo de módulos.

Configuração resultante:

- `package.json`: `"type": "module"`; scripts de teste com
  `node --experimental-vm-modules ./node_modules/jest/bin/jest.js`;
- `tsconfig.json`: `module` e `moduleResolution` em `nodenext`;
- Jest (unit e e2e): `extensionsToTreatAsEsm: ['.ts']`, ts-jest com
  `useESM: true`;
- todos os imports relativos com extensão `.js`.

## Consequências

### Positivas
- Um único modelo de módulos em todo o projeto.
- O TypeScript (`nodenext`) **exige** a extensão nos imports relativos. A
  inconsistência anterior não volta sem o compilador acusar.
- `npm run build`, `npm test` e `npm run test:e2e` passam sem workarounds.

### Negativas / pontos de atenção
- **`.js` em arquivos `.ts`:** é o padrão do Node ESM. O import aponta para o
  arquivo que existirá em runtime, porque o TypeScript não reescreve caminhos.
- **Flag experimental:** os testes dependem de `--experimental-vm-modules` e
  exibem `ExperimentalWarning`. Uma mudança no Jest