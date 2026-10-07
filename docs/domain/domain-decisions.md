# Decisões de Domínio — Ciso Excursões

## 1. Objetivo

Este documento registra decisões tomadas durante a modelagem do domínio do Ciso Excursões.

Seu objetivo é preservar o raciocínio utilizado para representar conceitos do negócio.

As decisões aqui registradas complementam:

* `docs/requirements/business-rules.md`
* `docs/requirements/use-cases.md`
* `docs/domain/domain-model.md`

---

# 2. Status da Excursão

## Decisão

A excursão possuirá inicialmente os seguintes estados:

```text
DRAFT
OPEN
CONFIRMED
IN_PROGRESS
FINISHED
CANCELLED
```

## Significado

### DRAFT

A excursão está sendo planejada e ainda não está disponível para operação comercial.

### OPEN

A excursão está aberta para receber participantes.

### CONFIRMED

A excursão foi confirmada operacionalmente.

### IN_PROGRESS

A excursão está acontecendo.

### FINISHED

A excursão foi concluída.

### CANCELLED

A excursão foi cancelada.

## Motivo

O modelo precisa representar o ciclo de vida operacional da excursão sem criar estados excessivamente específicos.

---

# 3. Status da Participação

## Decisão

A participação possuirá inicialmente apenas:

```text
ACTIVE
CANCELLED
```

## Motivo

Situações como:

* sem assento;
* sem pagamento completo;
* sem acomodação temporariamente;

não representam necessariamente estados da participação.

São condições independentes que podem ser consultadas diretamente.

Isso evita criar uma máquina de estados complexa.

---

# 4. Status da Compra de Ingresso

## Decisão

A compra de ingresso realizada pelo participante possuirá inicialmente:

```text
REQUESTED
CONFIRMED
```

## Motivo

A solicitação do participante e a confirmação da operação podem ocorrer em momentos diferentes.

A regra atual não permite cancelamento após a confirmação da compra.

---

# 5. Separação entre compra do participante e compra do fornecedor

## Decisão

Serão tratados como conceitos diferentes:

```text
TicketPurchase
```

representa o ingresso adquirido pelo participante.

Enquanto:

```text
TicketSupplierPurchase
```

representa a compra realizada pela Ciso junto ao fornecedor.

## Motivo

As duas operações possuem objetivos financeiros diferentes.

### Compra do participante

Representa:

> Quanto o passageiro pagará à Ciso.

### Compra do fornecedor

Representa:

> Quanto a Ciso precisa pagar ao fornecedor.

Essa separação permite calcular demanda, custos e margem.

---

# 6. Fornecedor

## Decisão

Será criado o conceito `Supplier`.

Um fornecedor poderá estar relacionado a diferentes operações do negócio.

Exemplos:

* empresa de transporte;
* hotel;
* fornecedor de ingressos;
* outros fornecedores.

## Motivo

A operação financeira da excursão precisa identificar quem fornece determinados serviços ou produtos.

O cadastro será inicialmente simples e poderá evoluir conforme novas necessidades aparecerem.

---

# 7. Preço atual versus preço contratado

## Decisão

O sistema deve diferenciar preço atual de preço histórico contratado.

### Excursão

```text
Excursion.referencePrice
```

representa o valor de referência atual da excursão.

```text
Participation.contractedAmount
```

representa o valor efetivamente contratado por aquele participante.

### Ingresso

```text
TicketType.currentPrice
```

representa o preço atual do ingresso.

```text
TicketPurchase.soldPrice
```

representa o preço efetivamente vendido ao participante.

## Motivo

Alterações futuras nos preços não podem alterar contratos já realizados.

---

# 8. Reembolso

## Decisão

Reembolsos serão representados como registros independentes associados aos pagamentos originais.

O pagamento original não será alterado ou excluído para representar um reembolso.

### Exemplo

```text
Payment
R$ 2.000

Refund
R$ 700
```

O histórico financeiro permanece preservado.

## Motivo

Isso permite rastreabilidade financeira e evita perda de histórico.

---

# 9. Crédito

## Decisão

O conceito de crédito não fará parte da primeira versão do modelo.

## Motivo

A necessidade foi identificada, mas as regras comerciais ainda não foram suficientemente detalhadas.

A entidade será criada quando suas regras forem definidas.

---

# 10. Assentos

## Decisão

Na primeira versão, assento não será uma entidade independente.

O assento será representado por uma posição dentro do ônibus da excursão.

A participação terá uma referência ao ônibus e ao número do assento.

## Motivo

A necessidade atual é apenas controlar:

* qual ônibus;
* qual assento;
* quem está sentado nele.

Caso futuramente seja necessário representar mapas físicos, corredores, poltronas especiais ou configurações diferentes, uma entidade `Seat` poderá ser introduzida.

---

# 11. Grupos de passageiros

## Decisão

Não será criada inicialmente uma entidade `TravelGroup`.

## Motivo

Apesar de famílias e amigos normalmente desejarem viajar juntos, ainda não existe uma necessidade funcional suficientemente definida para justificar uma entidade própria.

A necessidade poderá ser revisitada posteriormente.

---

# 12. Princípio de evolução

O modelo deve evitar entidades criadas apenas para antecipar necessidades futuras.

Uma nova entidade deve ser introduzida quando existir:

* regra de negócio;
* comportamento próprio;
* ciclo de vida;
* relacionamento relevante;
* necessidade de consulta ou alteração independente.

A evolução do domínio deve ocorrer conforme as necessidades reais do negócio forem identificadas.
