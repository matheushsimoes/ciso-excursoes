# Domain Model

## 1. Visão geral

O domínio da Ciso Excursões é organizado em torno da `Excursion`.

Uma excursão representa uma viagem específica, em determinado período, para determinado destino.

A pessoa é uma entidade independente e sua relação com uma excursão é representada por `Participation`.

```text
Person
   │
   │ 1:N
   ▼
Participation
   │
   │ N:1
   ▼
Excursion
```

---

# 2. Person

`Person` representa uma pessoa cadastrada no sistema.

A pessoa existe independentemente das excursões das quais participa.

Principais informações:

* nome completo;
* documento;
* data de nascimento;
* telefone;
* e-mail.

Uma mesma pessoa pode participar de várias excursões.

---

# 3. Excursion

`Excursion` representa uma excursão específica.

Principais informações:

* nome;
* destino;
* tipo (`DAY_TRIP` ou `OVERNIGHT`);
* data de início;
* data de término;
* preço de referência;
* status.

Uma excursão pode possuir:

* participantes;
* transporte;
* hotéis;
* atividades;
* compras de ingressos;
* despesas;
* informações financeiras.

---

# 4. Participation

`Participation` representa a participação de uma pessoa em uma excursão específica.

É onde ficam as informações específicas daquela viagem.

Principais informações:

* pessoa;
* excursão;
* valor contratado;
* status;
* veículo;
* assento;
* quarto.

A combinação `person + excursion` deve ser única.

---

# 5. Transporte

O domínio de transporte possui três níveis:

```text
BusType
   │
   ▼
ExcursionBus
   │
   ▼
ExcursionVehicle
   │
   ▼
Participation
```

Essa separação permite representar corretamente múltiplas unidades do mesmo tipo de ônibus.

## 5.1 BusType

`BusType` representa um tipo ou configuração de ônibus disponível no cadastro.

Exemplos:

* Double-Deck Style — 64 lugares;
* Convencional — 46 lugares;
* Micro-ônibus — 32 lugares.

Principais informações:

* nome;
* capacidade;
* descrição.

`BusType` não representa um veículo específico utilizado em uma excursão.

---

## 5.2 ExcursionBus

`ExcursionBus` representa a contratação de uma quantidade de determinado `BusType` para uma excursão.

Exemplo:

```text
Excursão Rio 2027
    └── Double-Deck Style
        └── quantity = 2
```

Uma excursão não deve possuir dois registros de `ExcursionBus` para o mesmo `BusType`.

A quantidade deve ser representada pelo campo `quantity`.

---

## 5.3 ExcursionVehicle

`ExcursionVehicle` representa cada unidade individual utilizada operacionalmente dentro da excursão.

Exemplo:

```text
ExcursionBus
Double-Deck Style
quantity = 2

    ├── ExcursionVehicle
    │   identifier = "Ônibus 1"
    │
    └── ExcursionVehicle
        identifier = "Ônibus 2"
```

A existência de `ExcursionVehicle` é necessária porque os passageiros precisam ser alocados a um ônibus específico.

---

## 5.4 Alocação de passageiros

A `Participation` possui uma referência opcional para `ExcursionVehicle`.

```text
Participation
    │
    └── ExcursionVehicle
            │
            └── seat_number
```

O número do assento não será uma entidade independente no MVP.

O assento é representado pela combinação:

```text
ExcursionVehicle + seat_number
```

Dois participantes não podem ocupar a mesma combinação quando estiverem ativos.

O mesmo número de assento pode existir em veículos diferentes.

---

# 6. Hospedagem

## 6.1 Hotel

`Hotel` representa um hotel cadastrado no sistema.

Uma excursão pode utilizar vários hotéis.

---

## 6.2 ExcursionHotel

`ExcursionHotel` representa a utilização de um hotel específico em uma excursão.

Essa entidade permite que as condições do hotel sejam específicas para determinada excursão.

---

## 6.3 Room

`Room` representa um quarto dentro da configuração de hospedagem da excursão.

Principais informações:

* identificação;
* capacidade;
* custo.

O custo representa o valor pago pela Ciso ao hotel.

Não representa o valor pago individualmente pelo passageiro.

---

## 6.4 Acomodação

A `Participation` possui uma referência para o quarto.

Uma participação pode estar em apenas um quarto dentro da excursão.

O sistema deve garantir que a capacidade do quarto não seja ultrapassada.

---

# 7. Atividades e ingressos

## 7.1 Activity

`Activity` representa uma atividade oferecida durante uma excursão.

Exemplos:

* evento de escola de samba;
* Cristo Redentor;
* passeio turístico;
* ponto turístico.

Uma atividade pode ser gratuita ou possuir ingressos pagos.

As atividades podem ser adicionadas ou alteradas mesmo depois de a excursão ter sido aberta.

---

## 7.2 TicketType

`TicketType` representa uma modalidade de ingresso de uma atividade.

Exemplos:

* Pista;
* Camarote;
* Arquibancada;
* Inteira;
* Meia-entrada.

Uma atividade pode possuir vários tipos de ingresso.

Cada tipo possui seu preço atual.

---

## 7.3 TicketPurchase

`TicketPurchase` representa a compra de um ingresso por um participante.

A compra deve armazenar o preço efetivamente vendido ao participante.

Esse preço é um snapshot histórico.

Alterações posteriores no preço atual de `TicketType` não alteram compras já realizadas.

Uma participação pode possuir vários ingressos de atividades diferentes.

Para uma mesma atividade, uma participação pode possuir no máximo um tipo de ingresso.

---

# 8. Fornecedores e aquisição de ingressos

## 8.1 Supplier

`Supplier` representa um fornecedor da Ciso.

No contexto de ingressos, pode representar, por exemplo, a empresa ou contato responsável pela venda dos ingressos de uma atividade.

---

## 8.2 TicketSupplierPurchase

`TicketSupplierPurchase` representa a aquisição de ingressos pela Ciso junto ao fornecedor.

Essa entidade é separada de `TicketPurchase`.

A separação é importante porque existem dois fluxos diferentes:

```text
Participante
     │
     ▼
TicketPurchase
     │
     │
     ▼
Ciso
     │
     ▼
TicketSupplierPurchase
     │
     ▼
Supplier
```

`TicketPurchase` representa quanto e por quanto o passageiro comprou.

`TicketSupplierPurchase` representa quanto e por quanto a Ciso adquiriu do fornecedor.

---

# 9. Pagamentos

`Payment` representa um pagamento realizado por um participante.

Um pagamento possui:

* data;
* valor;
* forma de pagamento;
* finalidade.

A finalidade pode estar relacionada ao pacote da excursão ou a uma compra específica de ingresso.

Os pagamentos de ingressos são independentes dos pagamentos do pacote.

O saldo devedor é calculado a partir dos valores devidos e dos pagamentos realizados.

---

# 10. Reembolsos

`Refund` representa um reembolso associado a um pagamento.

Um pagamento pode possuir um ou mais registros de reembolso.

A soma dos reembolsos não pode ultrapassar o valor original do pagamento.

---

# 11. Despesas

`Expense` representa uma despesa operacional da excursão.

Exemplos:

* transporte;
* hotel;
* ingressos;
* alimentação;
* brindes;
* seguro;
* outras despesas.

Toda despesa pertence a uma excursão.

---

# 12. Relacionamentos principais

```text
Person
  │
  │ 1:N
  ▼
Participation
  │
  ├─────────────── N:1 ───────────────► Excursion
  │
  ├─────────────── N:1 ───────────────► ExcursionVehicle
  │
  ├─────────────── N:1 ───────────────► Room
  │
  ├─────────────── 1:N ───────────────► TicketPurchase
  │
  └─────────────── 1:N ───────────────► Payment


Excursion
  │
  ├── 1:N ──► Participation
  │
  ├── 1:N ──► ExcursionBus
  │             │
  │             └── N:1 ──► BusType
  │             │
  │             └── 1:N ──► ExcursionVehicle
  │
  ├── 1:N ──► ExcursionHotel
  │             │
  │             └── N:1 ──► Hotel
  │                         │
  │                         └── 1:N ──► Room
  │
  ├── 1:N ──► Activity
  │             │
  │             └── 1:N ──► TicketType
  │
  ├── 1:N ──► TicketSupplierPurchase
  │
  └── 1:N ──► Expense


TicketType
  │
  └── 1:N ──► TicketPurchase


Supplier
  │
  └── 1:N ──► TicketSupplierPurchase


Payment
  │
  └── 1:N ──► Refund
```

---

# 13. Integridade

As principais regras de integridade são:

### Banco de dados

* `Person.document` deve ser único.
* `Participation(person_id, excursion_id)` deve ser único.
* `ExcursionBus(excursion_id, bus_type_id)` deve ser único.
* `ExcursionVehicle` deve pertencer a um `ExcursionBus`.
* `seat_number` somente pode existir quando houver `ExcursionVehicle`.
* não pode haver assento duplicado para participantes ativos no mesmo veículo;
* `Activity` deve pertencer a uma excursão;
* `TicketType` deve pertencer a uma atividade;
* `Payment.amount` deve ser maior que zero;
* `Expense` deve pertencer a uma excursão;
* valores monetários devem utilizar `NUMERIC(12,2)`.

### Aplicação

Inicialmente serão responsabilidade da aplicação:

* validar capacidade do ônibus;
* validar capacidade do quarto;
* validar que veículo e quarto pertencem à mesma excursão da participação;
* garantir no máximo um tipo de ingresso por atividade para uma participação;
* impedir cancelamento de ingresso;
* garantir que o total de reembolsos não ultrapasse o pagamento;
* controlar a criação/remoção de `ExcursionVehicle` conforme a quantidade de `ExcursionBus`;
* impedir redução de quantidade de ônibus quando houver passageiros que dependam dos veículos removidos.

---

# 14. Conceitos deliberadamente não modelados

Os seguintes conceitos não serão entidades independentes no MVP:

### Seat

Não será criada uma entidade `Seat`.

O assento será representado por:

```text
ExcursionVehicle + seat_number
```

Uma entidade própria poderá ser criada futuramente caso seja necessário representar layouts físicos diferentes.

### TravelGroup

Não será criada uma entidade de grupo de viagem inicialmente.

Famílias e amigos poderão ser tratados operacionalmente sem criar uma estrutura formal de grupo.

### Credit

Crédito de cancelamento não será modelado inicialmente como entidade própria.

A necessidade será reavaliada quando o fluxo financeiro de cancelamento for implementado.

### Vehicle/Fleet

Não será criada uma entidade global de veículo físico.

O MVP não precisa controlar:

* placa;
* chassi;
* proprietário;
* empresa de transporte;
* documentação do veículo.

`ExcursionVehicle` é suficiente para controlar a unidade operacional utilizada naquela excursão.
