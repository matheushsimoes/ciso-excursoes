# Domain Decisions

Este documento registra decisões importantes de modelagem do domínio da Ciso Excursões.

---

## DD01 — Status da excursão

Uma excursão possui os seguintes estados:

* `DRAFT`
* `OPEN`
* `CONFIRMED`
* `IN_PROGRESS`
* `FINISHED`
* `CANCELLED`

A máquina de estados poderá ser refinada conforme os fluxos da aplicação forem implementados.

---

## DD02 — Status da participação

Uma participação possui inicialmente:

* `ACTIVE`
* `CANCELLED`

Cancelamentos não excluem registros históricos.

---

## DD03 — Status da compra de ingresso

Uma compra de ingresso possui inicialmente:

* `REQUESTED`
* `CONFIRMED`

---

## DD04 — Separação entre compra do passageiro e aquisição do fornecedor

`TicketPurchase` e `TicketSupplierPurchase` são entidades distintas.

`TicketPurchase` representa a relação comercial entre Ciso e passageiro.

`TicketSupplierPurchase` representa a relação comercial entre Ciso e fornecedor.

Essa separação é necessária porque preços, quantidades e momentos de aquisição podem ser diferentes.

---

## DD05 — Fornecedor

Foi criada a entidade `Supplier` para representar fornecedores relacionados às compras de ingressos.

A entidade poderá futuramente ser reutilizada para outros fornecedores, como hotéis ou empresas de transporte, caso isso seja necessário.

Não serão criadas entidades específicas de fornecedor para cada categoria neste momento.

---

## DD06 — Preço atual versus preço histórico

O preço atual de uma entidade não deve ser utilizado para reconstruir transações históricas.

Por isso:

* `Excursion.reference_price` representa o preço de referência atual da excursão;
* `Participation.contracted_amount` representa o valor efetivamente contratado pelo participante;
* `TicketType.current_price` representa o preço atual do tipo de ingresso;
* `TicketPurchase.sold_price` representa o preço efetivamente vendido ao participante.

Os valores históricos devem ser armazenados na própria transação.

---

## DD07 — Reembolso

Reembolso será representado como uma entidade própria (`Refund`) relacionada ao pagamento original.

Isso permite preservar o histórico financeiro.

O pagamento original não deve ser alterado ou excluído para representar um reembolso.

---

## DD08 — Crédito

Crédito decorrente de cancelamento não será modelado como entidade própria no MVP.

A decisão poderá ser revisada quando o fluxo financeiro de créditos for implementado.

---

# DD09 — Transporte: tipo, quantidade e unidade operacional

## Contexto

Uma excursão pode utilizar várias unidades do mesmo tipo de ônibus.

Exemplo:

> 2 ônibus Double-Deck Style com 64 lugares.

Não existe necessidade de criar dois registros diferentes para representar essas duas unidades.

Ao mesmo tempo, a operação precisa identificar cada ônibus individualmente para controlar os passageiros e os assentos.

## Decisão

O transporte será dividido em três níveis:

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

Representa o tipo/configuração de ônibus.

Exemplo:

```text
Double-Deck Style
64 lugares
```

### ExcursionBus

Representa a quantidade contratada daquele tipo para uma excursão.

Exemplo:

```text
Double-Deck Style
quantity = 2
```

Deve existir no máximo um `ExcursionBus` para cada combinação de:

```text
excursion + bus_type
```

### ExcursionVehicle

Representa cada unidade individual utilizada operacionalmente.

Exemplo:

```text
Ônibus 1
Ônibus 2
```

A participação será relacionada ao `ExcursionVehicle`, pois a alocação de passageiros e assentos precisa identificar o ônibus específico.

## Motivo

Essa abordagem evita duplicação conceitual e mantém o nível de detalhe necessário para a operação.

O sistema consegue representar:

```text
2 × Double-Deck 64 lugares
```

e, simultaneamente:

```text
Ônibus 1 → passageiros e assentos
Ônibus 2 → passageiros e assentos
```

## Consequências

`ExcursionBus.quantity` representa a quantidade contratada/configurada.

`ExcursionVehicle` representa as unidades individuais disponíveis para operação.

O MVP não controlará informações de frota física como:

* placa;
* chassi;
* proprietário;
* empresa transportadora;
* documentação.

---

## DD10 — Assento

Não será criada uma entidade independente para assentos no MVP.

O assento será representado por:

```text
ExcursionVehicle + seat_number
```

Isso permite que o mesmo número exista em veículos diferentes.

Exemplo:

```text
Ônibus 1 → assento 23
Ônibus 2 → assento 23
```

São posições distintas.

Uma entidade `Seat` poderá ser introduzida futuramente caso seja necessário controlar layouts físicos dos veículos.

---

## DD11 — Grupo de viagem

Não será criada uma entidade `TravelGroup` inicialmente.

Famílias e amigos poderão ser organizados operacionalmente sem necessidade de uma entidade própria.

A necessidade poderá ser revisada quando forem implementados recursos específicos para grupos.

---

## DD12 — Custos versus preços comerciais

Custos internos da Ciso não devem ser confundidos com preços cobrados dos passageiros.

Exemplos:

* custo do quarto → `Room.cost`;
* valor do pacote → `Participation.contracted_amount`;
* preço de ingresso ao passageiro → `TicketPurchase.sold_price`;
* custo de ingresso para a Ciso → `TicketSupplierPurchase`.

Essa separação é importante para o fechamento financeiro da excursão.

---

## DD13 — Valores monetários

Valores monetários serão armazenados utilizando:

```text
NUMERIC(12,2)
```

Não será utilizado `FLOAT` para valores financeiros.

Na aplicação, valores monetários são representados como string decimal (ex.: `"1500.00"`), nunca como `number`. Cálculos financeiros são feitos em centavos inteiros. Ver ADR 0003.

---

## DD14 — Status

Inicialmente, os status serão representados como `VARCHAR` com `CHECK`.

Não serão utilizados PostgreSQL `ENUM` neste momento.

Motivo: facilitar evolução do domínio sem necessidade de alterar tipos ENUM do banco sempre que novos estados forem necessários.

---

## DD15 — Timestamps

Datas e horários de auditoria utilizarão:

```text
TIMESTAMPTZ
```

Campos como `created_at` e `updated_at` devem armazenar informações de data/hora com timezone.

---

## DD16 — Tipo da excursão

A excursão possui o campo `type`, com os valores `DAY_TRIP` e `OVERNIGHT`, representado como `VARCHAR` com `CHECK` (seguindo a DD14).

O tipo foi preferido a derivar a informação da existência de hotéis associados, pois torna a intenção explícita desde o cadastro e permite identificar pendências de hospedagem mesmo antes de os hotéis serem cadastrados.

Introduzido pela migration `002_add_excursion_type.sql`.
