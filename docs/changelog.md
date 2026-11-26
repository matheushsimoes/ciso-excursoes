# Changelog

## 2026-10-07

### Inicialização do projeto

* Repositório `ciso-excursoes` criado.
* Definida documentação versionada no próprio repositório.
* Definido GitHub como fonte da verdade do projeto.
* Criada estrutura inicial de documentação.
* Definida arquitetura inicial como modular monolith.
* Iniciado levantamento de regras de negócio e modelagem do domínio.

### Regras de negócio

* Criadas as regras de negócio iniciais da aplicação.
* Definidas regras para pessoas e participações.
* Definidas regras para excursões.
* Definidas regras para transporte.
* Definidas regras para hospedagem.
* Definidas regras para atividades e ingressos.
* Definidas regras para pagamentos.
* Definidas regras para cancelamentos e substituições.
* Definidas regras para despesas e fechamento financeiro.

### Casos de uso

* Criado levantamento inicial dos casos de uso da aplicação.
* Separados casos de uso do MVP e funcionalidades futuras.

### Modelo de domínio

* Criado modelo inicial das principais entidades.
* Definida separação entre `Person` e `Participation`.
* Definida separação entre custos internos e valores comerciais.
* Definido modelo inicial de transporte.
* Definido modelo inicial de hospedagem.
* Definido modelo inicial de atividades e ingressos.
* Definido modelo inicial financeiro.

---

## 2026-10-07 — Alteração do modelo de transporte

### Decisão

O modelo de transporte foi alterado para representar corretamente múltiplas unidades do mesmo tipo de ônibus em uma excursão.

### Modelo anterior

`ExcursionBus` representava diretamente um ônibus individual.

Isso faria com que uma excursão utilizando dois ônibus Double-Deck de 64 lugares precisasse possuir dois registros separados.

### Novo modelo

O transporte passa a possuir três níveis:

```text
BusType
    │
    ▼
ExcursionBus
    │
    ▼
ExcursionVehicle
```

### BusType

Representa o tipo/configuração do ônibus.

Exemplo:

```text
Double-Deck Style
64 lugares
```

### ExcursionBus

Representa a quantidade de unidades daquele tipo contratadas para uma excursão.

Exemplo:

```text
Double-Deck Style
quantity = 2
```

Uma excursão não deve possuir dois registros de `ExcursionBus` para o mesmo `BusType`.

### ExcursionVehicle

Representa cada unidade individual utilizada operacionalmente.

Exemplo:

```text
Ônibus 1
Ônibus 2
```

### Impacto em Participation

A participação passa a referenciar `ExcursionVehicle` em vez de `ExcursionBus`.

Isso permite controlar:

* ônibus específico;
* número do assento;
* ocupação;
* realocação de passageiros.

### Outras decisões

* Mantida a alocação manual de passageiros.
* Mantida a regra de unicidade de assento por veículo.
* Mantida a capacidade definida pelo `BusType`.
* Não será criada uma entidade global de frota/veículo no MVP.
* Não será criada uma entidade independente de assento no MVP.

## 2026-10-08 - Alteração dos módulos de backend

Foi decidido que o backend utilizará ESM de forma consistente (ADR 0001). O NestJS 12 é distribuído apenas como ESM, e com Jest a flag `--experimental-vm-modules` é necessária em qualquer cenário, então migrar para CommonJS não traria benefício e manteria dois modelos de módulos convivendo.

## 2026-10-09 - Validação de entrada e datas de negócio

* Adicionada validação dos payloads com `class-validator` e `ValidationPipe` global (registrado via `APP_PIPE` para valer também nos testes E2E).
* Payloads inválidos ou com campos desconhecidos passam a retornar `400` em vez de `500`.
* Datas de negócio passam a ser representadas como string `YYYY-MM-DD` em todas as camadas (ADR 0002).
* Corrigido o formato inconsistente de `birthDate` entre `POST`, `GET` e `PATCH`.

## 2026-10-09 - Tipo da excursão e valores monetários

* Adicionada a coluna `type` (`DAY_TRIP` / `OVERNIGHT`) em `excursion` pela migration `002_add_excursion_type.sql`.
* RN22 atualizada: a obrigatoriedade de hospedagem vale apenas para excursões `OVERNIGHT`.
* Criadas a RN54 (tipo da excursão) e a RN55 (status inicial e mudança de status).
* Registrada a DD16 (tipo da excursão) e complementada a DD13.
* Valores monetários representados como string decimal na aplicação (ADR 0003).

## 2026-10-20 - Módulo de excursões e integração contínua

* Criado o módulo `Excursion` com cadastro, consulta, listagem e edição (UC01, UC02).
* Preço de referência normalizado com duas casas decimais em todas as respostas.
* Criado o script `database/scripts/reset-local-db.sh`, que recria um banco local a partir das migrations.
* Criado o workflow de CI no GitHub Actions: lint, typecheck, build, testes unitários e testes e2e com o banco montado apenas pelas migrations.
* Corrigido o banco de teste local, que estava divergente das migrations (faltavam `created_at` e `updated_at` em `excursion`).

## 2026-10-21 - Ciclo de vida da excursão

* Implementada a mudança de status da excursão (UC03) em `PATCH /excursions/:id/status`.
* RN55 detalhada com os status, as transições permitidas e os pontos em aberto.
* Criada a RN56: excursões `FINISHED` ou `CANCELLED` não podem ser editadas.
* Transição não permitida retorna `409 Conflict`; solicitar o status atual é idempotente.

## 2026-11-26 - Aplicação completa (MVP)

### Backend

* Criados os módulos `participation`, `transport`, `accommodation`, `activity`, `finance` e `report`, cobrindo todos os casos de uso do MVP (mapa em `use-cases.md`, seção 17).
* Busca de pessoas por nome ou documento (`GET /persons?search=`).
* Regras de capacidade, poltrona, saldo e devolução aplicadas com bloqueio de linha dentro de transação (ADR 0004).
* Pagamentos imutáveis, devoluções separadas e chave de idempotência (ADR 0005).
* RN22 aplicada: excursão com pernoite só é confirmada com todos os passageiros em quartos.
* Criadas as regras RN57 a RN67.
* Painel (`GET /dashboard`), lista de passageiros com idade na data de ida e exportação CSV para o seguro.
* `GET /health` para verificar aplicação e banco.

### Banco de dados

* Migrations `003` (cancelamento da participação), `004` (chave de idempotência do pagamento) e `005` (índices para relatórios e busca).
* Executor de migrations `scripts/migrate.mjs` com a tabela `schema_migrations` (ADR 0007).
* Script `seed-demo.mjs` com dados de demonstração.

### Interface web

* Interface responsiva em português, servida pela própria API (ADR 0006): painel, excursões (resumo, passageiros, mapa de poltronas, quartos, atividades, financeiro, relatórios), passageiro, pessoas e cadastros.
* No celular, navegação inferior, tabelas em formato de cartão e diálogos que abrem de baixo para cima.

### Infraestrutura

* `Dockerfile` multi-stage, usuário sem privilégios, migrations aplicadas na inicialização e healthcheck.
* `docker-compose.yml` na raiz com PostgreSQL e aplicação (`docker compose up --build`). O arquivo `backend/docker-compose.yml` foi removido.
* CI passa a aplicar as migrations com `npm run migrate`.

