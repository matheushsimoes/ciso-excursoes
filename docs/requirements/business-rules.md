# Regras de Negócio

## 1. Excursões e pessoas

### RN01 — Pessoa pode participar de várias excursões

Uma mesma pessoa pode participar de várias excursões diferentes, em datas diferentes.

### RN02 — Uma participação por pessoa em cada excursão

Uma pessoa não pode possuir mais de uma participação ativa ou histórica na mesma excursão.

A combinação `person + excursion` deve ser única.

### RN03 — Informações específicas da viagem

Informações específicas de uma viagem devem ficar na `Participation`, e não na `Person`.

Exemplos:

* valor contratado;
* status da participação;
* transporte;
* assento;
* quarto.

### RN04 — Múltiplas excursões

O sistema deve permitir o cadastro e gerenciamento de múltiplas excursões, independentemente do destino ou ano.

---

# 2. Excursão

### RN05 — Múltiplos hotéis

Uma excursão pode utilizar um ou mais hotéis.

### RN06 — Atividades podem ser adicionadas posteriormente

Atividades podem ser cadastradas, alteradas ou adicionadas mesmo depois de a excursão ter sido aberta para venda.

### RN07 — Preço de referência

Uma excursão possui um preço de referência utilizado como base comercial.

Esse valor não representa necessariamente o valor pago por cada participante.

### RN54 — Tipo da excursão

Toda excursão possui um tipo:

* `DAY_TRIP`: bate-volta, sem hospedagem;
* `OVERNIGHT`: com pernoite e hospedagem.

O tipo deve ser informado obrigatoriamente no cadastro. O sistema não assume um valor padrão.

Ponto em aberto: confirmar se uma excursão `DAY_TRIP` sempre começa e termina na mesma data. Enquanto não houver confirmação, essa restrição não é aplicada.

### RN55 — Status inicial e mudança de status

Toda excursão é criada com status `DRAFT`.

O status não é alterado pela edição comum dos dados da excursão. A mudança de status é uma operação própria e segue as transições permitidas do ciclo de vida da excursão.

### RN08 — Valor contratado individual

Cada participação possui seu próprio valor contratado.

O valor pode ser:

* igual ao preço de referência;
* menor que o preço de referência;
* maior que o preço de referência, se necessário;
* zero, quando a participação for gratuita.

O sistema não deve tratar obrigatoriamente essa diferença como um simples desconto.

### RN09 — Pacote comercial

O pacote da excursão representa comercialmente a combinação de transporte e hospedagem.

Os custos internos de transporte e hospedagem não precisam ser apresentados separadamente ao passageiro.

---

# 3. Transporte

### RN10 — Múltiplos ônibus

Uma excursão pode utilizar um ou mais tipos de ônibus e pode contratar múltiplas unidades de um mesmo tipo.

### RN11 — Tipo de ônibus e quantidade

`BusType` representa uma configuração/tipo de ônibus disponível no cadastro, contendo sua capacidade.

`ExcursionBus` representa a quantidade de unidades daquele tipo contratadas para uma excursão.

Exemplo:

```text
Double-Deck Style
64 lugares
Quantidade na excursão: 2
```

Não devem ser criados dois registros diferentes de `ExcursionBus` para representar as duas unidades do mesmo tipo.

### RN12 — Unidade individual de ônibus

Cada unidade individual utilizada operacionalmente na excursão é representada por `ExcursionVehicle`.

Uma configuração `ExcursionBus` com quantidade 2 pode gerar:

* Ônibus 1;
* Ônibus 2.

### RN13 — Transporte opcional

Uma participação pode não possuir transporte inicialmente.

### RN14 — Transporte pode ser adicionado posteriormente

O transporte pode ser atribuído posteriormente à participação, desde que exista capacidade disponível.

### RN15 — Transporte faz parte do pacote

Quando o participante contrata o pacote completo, o transporte faz parte do pacote comercial juntamente com a hospedagem.

O custo individual do transporte não é necessariamente apresentado ou cobrado separadamente do passageiro.

### RN16 — Alocação manual de veículo e assento

A definição do ônibus e do assento de cada participante é realizada manualmente pelo responsável pela excursão.

### RN17 — Não pode haver assento duplicado

Dois participantes ativos não podem ocupar o mesmo número de assento dentro do mesmo `ExcursionVehicle`.

O mesmo número de assento pode existir em veículos diferentes da mesma excursão.

### RN18 — Assento depende de veículo

Um participante somente pode possuir número de assento quando possuir um `ExcursionVehicle` associado.

### RN19 — Capacidade do veículo

A quantidade de passageiros alocados a um `ExcursionVehicle` não pode ultrapassar a capacidade definida pelo seu `BusType`.

### RN20 — Alteração da configuração de transporte

A quantidade de veículos de determinado tipo pode ser alterada enquanto a operação permitir.

Caso uma redução de quantidade afete veículos que já possuem passageiros alocados, os passageiros deverão ser realocados antes da remoção dessas unidades.

### RN21 — Realocação manual

O sistema não realiza automaticamente a redistribuição de passageiros entre veículos.

Quando houver alteração da configuração de transporte, o responsável pela excursão deverá realizar a realocação.

---

# 4. Hospedagem

### RN22 — Participação deve possuir hospedagem em excursões com pernoite

Em excursões do tipo `OVERNIGHT`, toda participação ativa que esteja operacionalmente confirmada deve possuir uma acomodação.

Em excursões do tipo `DAY_TRIP` (bate-volta), não há hospedagem e a participação não possui acomodação.

Atualmente não existe exceção para participantes sem hospedagem em excursões `OVERNIGHT`. Caso essa necessidade surja, a evolução prevista é um campo na participação indicando a dispensa de hospedagem.

A regra é verificada como validação de completude (por exemplo, antes de confirmar a excursão), e não impede o cadastro da participação, pois a acomodação é alocada posteriormente.

### RN23 — Uma participação possui uma acomodação

Uma pessoa não pode estar em dois quartos diferentes simultaneamente dentro da mesma excursão.

### RN24 — Múltiplos hotéis

Uma excursão pode utilizar vários hotéis.

### RN25 — Capacidade do quarto

A quantidade de participantes alocados a um quarto não pode ultrapassar sua capacidade.

### RN26 — Valor do quarto é custo interno

O custo do quarto representa o valor que a Ciso paga ao hotel.

Esse valor não é necessariamente o valor cobrado individualmente do passageiro.

### RN27 — Acomodação é gerenciada manualmente

A definição dos quartos e das pessoas que os ocupam é realizada manualmente pelo responsável pela excursão.

### RN28 — Passageiro não paga o quarto separadamente

O passageiro não possui uma cobrança individual de hospedagem.

A hospedagem faz parte do pacote comercial da excursão.

---

# 5. Atividades e ingressos

### RN29 — Atividades são opcionais

Uma atividade pode ser oferecida aos participantes sem que seja obrigatória.

### RN30 — Atividade pode ser gratuita

Uma atividade pode não possuir custo de ingresso.

### RN31 — Uma atividade pode possuir vários tipos de ingresso

Uma atividade pode possuir diferentes tipos de ingresso.

Exemplos:

* Pista;
* Camarote;
* Arquibancada;
* Inteira;
* Meia-entrada.

### RN32 — Um participante pode comprar no máximo um tipo de ingresso por atividade

Uma participação não pode possuir dois tipos diferentes de ingresso para a mesma atividade.

### RN33 — Controle de demanda

A Ciso precisa controlar quantos ingressos precisa adquirir para os participantes.

Não é necessário implementar um controle completo de estoque de ingressos de terceiros no MVP.

### RN34 — Ingressos podem ser adquiridos posteriormente

A compra dos ingressos pode ocorrer depois que a excursão já estiver aberta, conforme a demanda dos participantes.

### RN35 — Preço vendido é congelado

O preço pago pelo participante deve ser armazenado no momento da compra.

Alterações posteriores no preço atual do tipo de ingresso não alteram o valor já contratado.

### RN36 — Ingresso não pode ser cancelado

No MVP, uma compra de ingresso realizada por um participante não pode ser cancelada.

Essa regra poderá ser revisada futuramente.

---

# 6. Pagamentos

### RN37 — Pagamentos são registrados individualmente

Cada pagamento realizado por um participante deve ser registrado separadamente.

### RN38 — Formas de pagamento

O sistema deve permitir pelo menos:

* dinheiro;
* Pix;
* cartão.

### RN39 — Todo pagamento possui uma finalidade

Cada pagamento deve identificar aquilo que está sendo pago.

Exemplos:

* pacote da excursão;
* ingresso de uma atividade.

### RN40 — Pagamento de ingresso é independente

O pagamento de um ingresso pode ocorrer independentemente dos pagamentos do pacote da excursão.

### RN41 — Saldo é calculado

O saldo devedor não deve ser armazenado diretamente.

Deve ser calculado com base no valor devido e nos pagamentos registrados.

---

# 7. Cancelamentos e substituições

### RN42 — Participação pode ser cancelada

Uma participação pode ser cancelada.

### RN43 — Cancelamento preserva histórico

O cancelamento não deve excluir a participação do banco de dados.

O histórico financeiro e operacional deve permanecer disponível.

### RN44 — Cancelamento pode gerar diferentes resultados financeiros

Um cancelamento pode resultar em:

* reembolso integral;
* reembolso parcial;
* nenhum reembolso;
* crédito futuro.

### RN45 — Substituição não é transferência direta

Quando uma pessoa desistir e outra assumir sua vaga, o sistema não deve criar uma transferência direta entre pessoas.

O processo será:

1. cancelar a participação original;
2. liberar a vaga;
3. cadastrar a nova pessoa na excursão;
4. realizar manualmente as novas alocações.

### RN46 — Realocação manual

O sistema não deve assumir automaticamente que a nova pessoa ocupará exatamente o mesmo transporte, assento ou quarto da pessoa anterior.

---

# 8. Pessoas

### RN47 — Pessoa existe independentemente de excursão

`Person` representa uma pessoa cadastrada no sistema independentemente das excursões das quais participa.

### RN48 — Dados obrigatórios

Uma pessoa deve possuir:

* nome completo;
* documento;
* data de nascimento;
* telefone;
* e-mail.

Telefone e e-mail podem ser opcionais caso a operação determine que não sejam obrigatórios.

### RN49 — Data de nascimento

A data de nascimento é necessária, entre outros motivos, para geração de informações utilizadas no seguro de viagem.

---

# 9. Despesas

### RN50 — Excursão possui despesas

Uma excursão pode possuir despesas operacionais.

Exemplos:

* transporte;
* hospedagem;
* ingressos;
* alimentação;
* brindes;
* seguro;
* outras despesas.

### RN51 — Despesa pertence à excursão

Toda despesa operacional deve estar associada a uma excursão.

---

# 10. Fechamento financeiro

### RN52 — Excursão possui fechamento financeiro

Após a realização da excursão, o responsável deve conseguir verificar:

* receita;
* despesas;
* pagamentos;
* valores de ingressos;
* resultado financeiro;
* lucro ou prejuízo.

### RN53 — Resultado financeiro é calculado

O resultado financeiro deve ser calculado a partir das receitas e despesas registradas.

Não deve ser necessário armazenar manualmente o lucro final.
