# Regras de Negócio — Ciso Excursões

## 1. Objetivo

Este documento define as regras de negócio que devem ser respeitadas pelo sistema Ciso Excursões.

As regras representam o comportamento esperado do negócio independentemente da tecnologia utilizada para implementar o sistema.

Alterações nas regras de negócio devem ser registradas neste documento e no `docs/changelog.md`.

---

# 2. Pessoas e Participações

## RN01 — Uma pessoa pode participar de múltiplas excursões

Uma pessoa cadastrada no sistema pode participar de diferentes excursões ao longo do tempo.

A pessoa representa o indivíduo, enquanto sua participação representa o vínculo daquela pessoa com uma excursão específica.

**Exemplo:**

João pode participar da excursão para o Carnaval do Rio em 2026 e novamente da excursão para Aparecida em 2027.

---

## RN02 — Uma pessoa não pode possuir duas participações na mesma excursão

Uma mesma pessoa não pode ser cadastrada duas vezes como participante da mesma excursão.

A identificação da pessoa deve ser reutilizada caso ela participe novamente de outra excursão.

---

## RN03 — A participação possui informações específicas da excursão

Informações que podem variar entre excursões devem pertencer à participação e não à pessoa.

Exemplos:

* valor contratado;
* situação da participação;
* transporte utilizado;
* assento;
* acomodação;
* ingressos adquiridos;
* pagamentos realizados.

---

# 3. Excursões

## RN04 — O sistema deve suportar múltiplas excursões

O sistema não deve ser limitado à excursão anual para o Rio de Janeiro.

Uma excursão possui, entre outras informações:

* nome;
* destino;
* data de saída;
* data de retorno;
* valor de referência;
* situação;
* configurações de transporte;
* configurações de hospedagem;
* atividades;
* participantes;
* despesas.

---

## RN05 — Uma excursão pode possuir múltiplos hotéis

Uma mesma excursão pode utilizar mais de um hotel.

Os hotéis utilizados devem ser associados especificamente à excursão.

---

## RN06 — Atividades podem ser adicionadas ou alteradas após a abertura da excursão

A definição das atividades não precisa estar completa no momento em que a excursão é aberta para vendas.

Uma nova atividade pode ser adicionada posteriormente.

Exemplos:

* evento de escola de samba;
* Cristo Redentor;
* pontos turísticos;
* eventos especiais.

---

# 4. Valores da Excursão

## RN07 — A excursão possui um valor de referência

A excursão possui um valor de referência utilizado como base comercial.

Esse valor não determina necessariamente quanto cada participante pagará.

---

## RN08 — Cada participação possui um valor contratado

O valor efetivamente contratado deve ser registrado individualmente para cada participante.

Esse valor pode ser:

* igual ao valor de referência;
* inferior ao valor de referência;
* superior ao valor de referência, caso necessário;
* zero, quando o participante não precisar pagar pelo pacote.

O sistema não deve tratar esse cenário apenas como um desconto.

O valor contratado representa o acordo comercial efetivamente realizado com aquele participante.

---

## RN09 — O pacote comercial representa transporte e hospedagem

O participante compra um pacote da excursão, e não os custos individuais de cada componente.

O valor cobrado do participante não precisa corresponder diretamente ao custo de:

* ônibus;
* quarto;
* hotel;
* outros componentes operacionais.

Os custos operacionais são controlados separadamente para fins financeiros.

---

# 5. Transporte

## RN10 — Uma excursão pode possuir múltiplos ônibus

Uma excursão pode utilizar um ou mais ônibus.

Cada ônibus utilizado deve possuir uma capacidade definida.

---

## RN11 — O tipo de ônibus é diferente do ônibus utilizado na excursão

O sistema deve diferenciar:

* características/tipo de ônibus;
* ônibus efetivamente configurado para uma excursão.

Exemplos de tipos:

* Double Deck — 64 lugares;
* ônibus convencional;
* micro-ônibus.

---

## RN12 — O transporte é opcional para uma participação

Um participante pode realizar a excursão sem utilizar o transporte disponibilizado.

Isso ocorre, por exemplo, quando o participante utiliza apenas a hospedagem.

---

## RN13 — O transporte pode ser adicionado posteriormente

Um participante inicialmente sem transporte pode receber uma vaga posteriormente, desde que exista disponibilidade.

---

## RN14 — O transporte faz parte do pacote comercial

Quando contratado, o transporte não é tratado como uma cobrança separada do pacote principal da excursão.

O custo do transporte é controlado internamente como custo operacional da excursão.

---

## RN15 — Os assentos são definidos manualmente

A alocação de participantes aos assentos é realizada manualmente pelo responsável pela excursão.

O sistema deve permitir:

* atribuir um participante a um ônibus;
* atribuir um assento;
* alterar o ônibus;
* alterar o assento;
* consultar a ocupação.

---

## RN16 — Um assento não pode ser ocupado por dois participantes ativos

Um mesmo assento de um mesmo ônibus não pode estar atribuído simultaneamente a duas participações ativas.

---

## RN17 — A configuração de transporte pode ser alterada

Os ônibus utilizados em uma excursão podem ser alterados após a criação da excursão.

Caso a alteração afete participantes já alocados, a realocação deverá ser realizada manualmente.

O sistema não deve mover automaticamente os participantes para novos assentos.

---

# 6. Hospedagem

## RN18 — Toda participação ativa deve possuir uma acomodação

Um participante da excursão deve possuir uma acomodação definida.

O participante não pode permanecer sem quarto durante a configuração final da excursão.

Durante etapas intermediárias de cadastro, a acomodação pode ainda não estar definida, desde que seja resolvida antes da confirmação operacional da participação.

---

## RN19 — Uma participação possui apenas uma acomodação

Uma participação não pode estar associada simultaneamente a diferentes quartos dentro da mesma excursão.

---

## RN20 — Uma excursão pode utilizar múltiplos hotéis

Uma excursão pode possuir acomodações distribuídas entre diferentes hotéis.

---

## RN21 — Quartos possuem capacidade

Cada quarto possui uma capacidade máxima de ocupantes.

A quantidade de participantes atribuídos ao quarto não pode ultrapassar sua capacidade.

---

## RN22 — O participante não paga o custo do quarto separadamente

O custo do quarto representa um custo operacional da excursão.

O participante paga o valor contratado do pacote, que inclui a hospedagem conforme as condições comerciais da excursão.

---

## RN23 — A ocupação dos quartos é definida manualmente

O responsável pela excursão define quem ficará em cada quarto.

Os participantes podem indicar preferências de companhia, mas a configuração final é administrada pelo responsável pela excursão.

---

# 7. Atividades e Ingressos

## RN24 — Atividades são opcionais

Nenhum participante é obrigado a adquirir uma atividade ou ingresso adicional.

---

## RN25 — Uma atividade pode ser gratuita

Uma atividade pode existir sem cobrança de ingresso.

---

## RN26 — Uma atividade pode possuir diferentes tipos de ingresso

Uma atividade pode disponibilizar diferentes tipos de ingresso.

Exemplos:

* pista;
* camarote;
* setor A;
* setor B;
* ingresso promocional.

Cada tipo pode possuir seu próprio preço.

---

## RN27 — Um participante pode adquirir no máximo um tipo de ingresso por atividade

Para uma determinada atividade, um participante pode possuir no máximo um tipo de ingresso.

Ele não pode possuir simultaneamente dois tipos diferentes de ingresso para a mesma atividade.

---

## RN28 — A quantidade de ingressos necessários deve ser controlada

O sistema deve permitir que o responsável pela excursão saiba quantos ingressos de cada tipo precisam ser adquiridos.

O sistema não precisa implementar um controle completo de estoque de ingressos vendidos por terceiros.

O objetivo principal é controlar a demanda dos participantes e a quantidade que precisa ser comprada.

---

## RN29 — O ingresso pode ser adquirido após a abertura da excursão

A aquisição dos ingressos pode ocorrer posteriormente, conforme a demanda dos participantes e a disponibilidade definida pelo fornecedor.

---

## RN30 — O preço vendido do ingresso deve ser preservado

Quando um participante adquire um ingresso, o preço efetivamente vendido deve ser registrado na compra.

Alterações futuras no preço atual do tipo de ingresso não podem alterar o valor originalmente contratado pelo participante.

---

## RN31 — Ingressos não podem ser cancelados

De acordo com a regra comercial atual, uma compra de ingresso realizada por um participante não pode ser cancelada.

Esta regra poderá ser alterada futuramente caso a política comercial seja modificada.

---

# 8. Pagamentos

## RN32 — O sistema deve registrar pagamentos individualmente

Cada pagamento deve possuir pelo menos:

* data;
* valor;
* método de pagamento;
* finalidade.

---

## RN33 — Métodos de pagamento aceitos

O sistema deve suportar atualmente:

* dinheiro;
* Pix;
* cartão.

Novos métodos poderão ser adicionados futuramente.

---

## RN34 — Todo pagamento deve possuir uma finalidade

O sistema deve identificar para que cada pagamento foi realizado.

Atualmente existem duas finalidades principais:

* pagamento do pacote da excursão;
* pagamento de um ingresso/atividade específica.

---

## RN35 — Pagamentos de ingressos são independentes do pagamento do pacote

Um participante pode pagar um ingresso antes de quitar o pacote principal da excursão.

Isso é necessário porque determinados ingressos possuem prazo de compra anterior à data limite do pagamento da excursão.

---

## RN36 — O saldo deve ser calculado

O saldo de um participante não deve ser armazenado como um valor fixo.

O saldo deve ser calculado com base nos valores contratados e nos pagamentos registrados.

---

# 9. Cancelamentos e Substituições

## RN37 — Uma participação pode ser cancelada

Um participante pode cancelar sua participação em uma excursão.

O cancelamento deve preservar o histórico financeiro da participação.

---

## RN38 — O cancelamento pode gerar diferentes resultados financeiros

Dependendo do caso, o cancelamento pode resultar em:

* reembolso integral;
* reembolso parcial;
* ausência de reembolso;
* crédito para utilização futura.

O tratamento específico de crédito será detalhado posteriormente.

---

## RN39 — O histórico financeiro não deve ser apagado após o cancelamento

Cancelar uma participação não significa apagar seus pagamentos ou demais registros financeiros.

O sistema deve manter o histórico da participação cancelada.

---

## RN40 — Substituição de participante não é uma transferência direta

Quando uma pessoa desiste e outra pessoa ocupa sua vaga, o sistema não deve tratar isso como uma transferência direta de participação.

O processo será:

1. cancelar a participação original;
2. liberar a vaga;
3. cadastrar ou localizar a nova pessoa;
4. criar uma nova participação para a nova pessoa;
5. atribuir manualmente a nova participação à vaga disponível.

A participação original e a nova participação devem permanecer como registros independentes.

---

## RN41 — A realocação de vagas é manual

Quando uma participação é cancelada, o sistema não deve escolher automaticamente quem ocupará a vaga.

A decisão e a alocação são realizadas pelo responsável pela excursão.

---

# 10. Dados dos Participantes

## RN42 — Pessoa possui cadastro independente da excursão

O cadastro da pessoa deve existir independentemente de sua participação em uma excursão.

Uma pessoa pode ser reutilizada em novas excursões.

---

## RN43 — Dados obrigatórios da pessoa

Atualmente são considerados obrigatórios:

* nome completo;
* documento;
* data de nascimento;
* telefone;
* e-mail.

---

## RN44 — Data de nascimento é necessária para seguro

A data de nascimento deve ser armazenada porque é necessária para a geração das informações utilizadas no seguro de viagem.

---

# 11. Despesas

## RN45 — A excursão pode possuir despesas operacionais

Despesas relacionadas à excursão devem poder ser registradas para permitir o fechamento financeiro.

Exemplos:

* transporte;
* hospedagem;
* ingressos;
* alimentação;
* brindes;
* seguro;
* outras despesas operacionais.

---

## RN46 — Despesas pertencem à excursão

Uma despesa deve estar associada à excursão à qual pertence.

---

# 12. Fechamento Financeiro

## RN47 — A excursão deve permitir fechamento financeiro

Após a realização da excursão, o responsável deve conseguir avaliar o resultado financeiro.

O fechamento deve considerar, no mínimo:

* valores contratados;
* pagamentos recebidos;
* despesas;
* custos relacionados a atividades;
* reembolsos;
* resultado financeiro da excursão.

---

# 13. Evolução das Regras

Estas regras representam o entendimento atual do negócio.

Quando uma regra for alterada:

1. este documento deve ser atualizado;
2. a alteração deve ser registrada no `docs/changelog.md`;
3. decisões arquiteturais afetadas devem possuir ou atualizar um ADR;
4. o modelo de domínio deve ser revisado;
5. os testes relacionados devem ser atualizados.

As regras de negócio são a referência principal para validar o comportamento do sistema.
