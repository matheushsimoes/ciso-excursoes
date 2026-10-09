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
