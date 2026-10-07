# Casos de Uso — Ciso Excursões

## 1. Objetivo

Este documento descreve as principais ações que os usuários do sistema precisam realizar para operar uma excursão.

Os casos de uso são derivados das regras de negócio definidas em `business-rules.md`.

Eles representam o comportamento esperado do sistema sem definir detalhes de implementação.

---

# 2. Atores

## 2.1 Responsável pela excursão

É o principal usuário do sistema.

Atualmente, considera-se que o responsável é o organizador da Ciso Excursões.

Ele é responsável por:

* criar excursões;
* configurar transporte;
* configurar hospedagem;
* cadastrar passageiros;
* administrar participações;
* definir assentos;
* definir acomodações;
* administrar atividades;
* registrar pagamentos;
* controlar ingressos;
* registrar despesas;
* realizar cancelamentos;
* consultar informações operacionais;
* acompanhar o resultado financeiro.

---

# 3. Gestão de Excursões

## UC01 — Criar excursão

### Objetivo

Cadastrar uma nova excursão no sistema.

### Pré-condições

Nenhuma.

### Fluxo principal

1. O responsável inicia o cadastro de uma excursão.
2. Informa o nome da excursão.
3. Informa o destino.
4. Informa a data de saída.
5. Informa a data de retorno.
6. Informa o valor de referência.
7. Salva a excursão.
8. O sistema cria a excursão.

### Resultado

A excursão passa a existir no sistema e pode ser configurada.

---

## UC02 — Editar excursão

### Objetivo

Alterar informações básicas de uma excursão existente.

### Exemplos

* alterar nome;
* alterar destino;
* alterar datas;
* alterar valor de referência;
* alterar situação.

### Regra relacionada

Alterações não podem comprometer informações históricas já registradas.

---

## UC03 — Alterar situação da excursão

### Objetivo

Permitir que o responsável acompanhe o ciclo de vida da excursão.

### Situações inicialmente previstas

* Planejamento;
* Aberta para vendas;
* Confirmada;
* Em execução;
* Finalizada;
* Cancelada.

> Os nomes e transições definitivos serão validados durante a modelagem do domínio.

---

# 4. Gestão de Pessoas

## UC04 — Cadastrar pessoa

### Objetivo

Cadastrar uma nova pessoa no sistema.

### Informações

* nome completo;
* documento;
* data de nascimento;
* telefone;
* e-mail.

### Resultado

A pessoa pode posteriormente participar de uma ou mais excursões.

---

## UC05 — Editar pessoa

### Objetivo

Atualizar os dados cadastrais de uma pessoa.

### Observação

Alterações cadastrais não devem modificar o histórico das participações anteriores.

---

## UC06 — Consultar pessoa

### Objetivo

Localizar uma pessoa cadastrada.

### Possíveis critérios

* nome;
* documento;
* telefone;
* e-mail.

---

## UC07 — Consultar histórico de excursões da pessoa

### Objetivo

Visualizar as excursões das quais uma pessoa participou ou participa.

### Informações esperadas

* excursão;
* período;
* situação da participação;
* valor contratado;
* pagamentos;
* acomodação;
* transporte;
* atividades.

---

# 5. Gestão de Participações

## UC08 — Adicionar pessoa a uma excursão

### Objetivo

Criar uma participação de uma pessoa em determinada excursão.

### Fluxo principal

1. O responsável seleciona uma excursão.
2. Localiza uma pessoa existente ou cadastra uma nova pessoa.
3. Informa o valor contratado.
4. Cria a participação.
5. O sistema registra o vínculo entre pessoa e excursão.

### Regras

* Uma pessoa não pode possuir duas participações na mesma excursão.
* O valor contratado deve ser registrado individualmente.

---

## UC09 — Alterar valor contratado

### Objetivo

Alterar o valor comercial acordado com um participante antes da consolidação financeira da participação.

### Observação

Alterações futuras devem preservar o histórico necessário para auditoria financeira.

> O mecanismo definitivo de histórico será definido posteriormente.

---

## UC10 — Consultar participação

### Objetivo

Visualizar todas as informações de uma pessoa dentro de uma excursão.

### Informações

* dados da pessoa;
* valor contratado;
* pagamentos;
* saldo;
* transporte;
* assento;
* acomodação;
* atividades;
* situação da participação.

---

# 6. Gestão de Transporte

## UC11 — Cadastrar tipo de ônibus

### Objetivo

Cadastrar uma configuração/tipo de ônibus.

### Exemplos

* Double Deck — 64 lugares;
* ônibus convencional;
* micro-ônibus.

### Informações

* nome;
* capacidade;
* características relevantes.

---

## UC12 — Adicionar ônibus à excursão

### Objetivo

Associar um ônibus/configuração de transporte a uma excursão.

### Resultado

A excursão passa a possuir uma opção de transporte disponível para seus participantes.

---

## UC13 — Alterar ônibus da excursão

### Objetivo

Alterar a configuração de transporte utilizada na excursão.

### Observação

Participantes previamente alocados podem precisar ser realocados.

O sistema não deve realizar essa realocação automaticamente.

---

## UC14 — Atribuir transporte a participante

### Objetivo

Adicionar transporte a uma participação que inicialmente não possuía transporte.

### Condição

Deve existir disponibilidade.

---

## UC15 — Atribuir assento

### Objetivo

Associar um participante a um ônibus e assento específicos.

### Regras

* o assento deve existir dentro da capacidade do ônibus;
* o assento não pode estar ocupado por outra participação ativa.

---

## UC16 — Alterar assento

### Objetivo

Alterar o ônibus e/ou assento de um participante.

### Resultado

A nova alocação substitui a anterior.

---

## UC17 — Consultar mapa de assentos

### Objetivo

Visualizar a ocupação dos ônibus da excursão.

### Informações

* ônibus;
* capacidade;
* assentos ocupados;
* assentos disponíveis;
* participante atribuído.

> Uma representação visual poderá ser implementada posteriormente.

---

# 7. Gestão de Hospedagem

## UC18 — Cadastrar hotel

### Objetivo

Cadastrar um hotel que possa ser utilizado em excursões.

---

## UC19 — Adicionar hotel à excursão

### Objetivo

Associar um hotel a uma excursão.

### Resultado

O hotel passa a fazer parte da configuração de hospedagem da excursão.

---

## UC20 — Cadastrar quarto

### Objetivo

Cadastrar uma unidade de acomodação disponível para a excursão.

### Informações

* identificação;
* tipo;
* capacidade;
* custo operacional.

### Exemplos

* Quarto 101 — duplo;
* Quarto 202 — triplo.

---

## UC21 — Associar quarto à excursão

### Objetivo

Definir os quartos disponibilizados pelo hotel para determinada excursão.

### Observação

O custo do quarto representa o custo operacional da excursão, e não o valor cobrado individualmente do participante.

---

## UC22 — Atribuir participante a quarto

### Objetivo

Definir a acomodação de um participante.

### Regras

* a participação deve possuir uma única acomodação;
* o quarto não pode ultrapassar sua capacidade;
* o quarto deve pertencer à configuração de hospedagem da excursão.

---

## UC23 — Alterar acomodação

### Objetivo

Mover um participante para outro quarto.

### Regras

A nova acomodação deve possuir capacidade disponível.

---

## UC24 — Consultar ocupação dos quartos

### Objetivo

Visualizar a ocupação da hospedagem.

### Informações

* hotel;
* quarto;
* capacidade;
* ocupantes;
* vagas disponíveis.

---

# 8. Gestão de Atividades

## UC25 — Criar atividade

### Objetivo

Cadastrar uma atividade vinculada à excursão.

### Exemplos

* evento de escola de samba;
* Cristo Redentor;
* passeio turístico;
* atividade gratuita.

### Informações iniciais

* nome;
* descrição;
* data, quando aplicável;
* situação;
* indicação de atividade gratuita.

---

## UC26 — Editar atividade

### Objetivo

Alterar informações de uma atividade.

### Observação

Atividades podem ser alteradas mesmo após a excursão ter sido aberta.

---

## UC27 — Cadastrar tipo de ingresso

### Objetivo

Criar uma opção de ingresso para determinada atividade.

### Informações

* nome;
* descrição;
* preço atual.

### Exemplos

* Pista — R$ 150;
* Camarote — R$ 300.

---

## UC28 — Alterar preço do tipo de ingresso

### Objetivo

Atualizar o preço atual de um tipo de ingresso.

### Regra

A alteração não deve modificar o preço de compras já realizadas.

---

# 9. Compra de Ingressos pelos Participantes

## UC29 — Registrar compra de ingresso pelo participante

### Objetivo

Registrar que um participante solicitou/adquiriu determinado ingresso.

### Fluxo

1. O responsável seleciona o participante.
2. Seleciona a atividade.
3. Seleciona o tipo de ingresso.
4. O sistema registra o preço vigente.
5. O sistema registra a compra.

### Regras

* atividade é opcional;
* cada participante pode possuir no máximo um tipo de ingresso por atividade;
* o preço vendido deve ser preservado;
* a compra não pode ser cancelada conforme regra atual.

---

## UC30 — Consultar demanda de ingressos

### Objetivo

Consolidar a quantidade de ingressos necessários para compra.

### Exemplo

```text
Evento X

Pista:
  18 ingressos

Camarote:
   7 ingressos

Total:
  25 ingressos
```

---

## UC31 — Registrar compra de ingressos com fornecedor

### Objetivo

Registrar a quantidade de ingressos que o responsável precisa/adquiriu junto ao fornecedor.

### Informações esperadas

* atividade;
* tipo de ingresso;
* quantidade;
* custo;
* fornecedor;
* data da compra.

> O modelo definitivo dessa operação será refinado durante a modelagem financeira.

---

# 10. Pagamentos

## UC32 — Registrar pagamento

### Objetivo

Registrar um pagamento realizado por um participante.

### Informações

* participante;
* data;
* valor;
* método;
* finalidade.

### Finalidades

* pacote da excursão;
* ingresso/atividade específica.

---

## UC33 — Consultar pagamentos do participante

### Objetivo

Visualizar o histórico financeiro de um participante.

### Resultado

O sistema deve apresentar:

* pagamentos realizados;
* valores;
* datas;
* métodos;
* finalidade;
* total pago;
* saldo.

---

## UC34 — Consultar situação financeira da excursão

### Objetivo

Visualizar a situação financeira consolidada da excursão.

### Informações

* valores contratados;
* valores recebidos;
* valores em aberto;
* despesas;
* custos de atividades;
* reembolsos;
* resultado financeiro.

---

# 11. Cancelamentos

## UC35 — Cancelar participação

### Objetivo

Cancelar a participação de uma pessoa em uma excursão.

### Fluxo

1. O responsável seleciona a participação.
2. Solicita o cancelamento.
3. Informa as condições financeiras aplicáveis.
4. O sistema registra o cancelamento.
5. O sistema mantém o histórico da participação.
6. A vaga fica disponível para eventual realocação manual.

---

## UC36 — Registrar reembolso

### Objetivo

Registrar um valor devolvido ao participante.

### Possibilidades

* reembolso integral;
* reembolso parcial.

### Observação

O reembolso deve permanecer associado ao histórico financeiro.

---

## UC37 — Substituir participante

### Objetivo

Permitir que outra pessoa ocupe a vaga deixada por uma participação cancelada.

### Fluxo

1. Cancelar a participação original.
2. Liberar a vaga.
3. Localizar/cadastrar a nova pessoa.
4. Criar uma nova participação.
5. Definir o valor contratado da nova participação.
6. Alocar manualmente transporte e acomodação, quando aplicável.

### Regra

Não existe transferência direta entre participações.

---

# 12. Despesas

## UC38 — Registrar despesa

### Objetivo

Registrar uma despesa relacionada à excursão.

### Exemplos

* hotel;
* ônibus;
* alimentação;
* brindes;
* seguro;
* ingressos;
* outras despesas.

### Informações

* categoria;
* descrição;
* valor;
* data.

---

## UC39 — Consultar despesas da excursão

### Objetivo

Visualizar todas as despesas relacionadas a uma excursão.

---

# 13. Relatórios e Consultas

## UC40 — Consultar lista de passageiros

### Objetivo

Visualizar todos os participantes de uma excursão.

### Informações

* nome;
* documento;
* telefone;
* situação;
* transporte;
* assento;
* hotel;
* quarto.

---

## UC41 — Consultar ocupação de transporte

### Objetivo

Visualizar a quantidade de passageiros por ônibus e assentos ocupados.

---

## UC42 — Consultar ocupação de hospedagem

### Objetivo

Visualizar a ocupação dos quartos e hotéis.

---

## UC43 — Consultar situação de pagamentos

### Objetivo

Identificar participantes:

* quitados;
* parcialmente pagos;
* inadimplentes;
* cancelados.

---

## UC44 — Consultar ingressos

### Objetivo

Visualizar:

* ingressos solicitados;
* quantidade por tipo;
* preço vendido;
* quantidade necessária para compra;
* custos de aquisição.

---

## UC45 — Consultar resultado financeiro

### Objetivo

Avaliar o resultado financeiro de uma excursão.

### Informações mínimas

* receita contratada;
* receita recebida;
* valores em aberto;
* despesas;
* custos de ingressos;
* reembolsos;
* resultado final.

---

# 14. Funcionalidades Futuras

As funcionalidades abaixo não fazem parte do escopo inicial, mas foram identificadas como possíveis evoluções.

## UC46 — Gerar crédito para participante

Permitir que um valor não reembolsado seja transformado em crédito para utilização futura.

---

## UC47 — Exportar dados para seguro

Gerar os dados necessários dos participantes para contratação/emissão do seguro de viagem.

---

## UC48 — Portal do participante

Permitir que o próprio passageiro consulte:

* sua excursão;
* pagamentos;
* saldo;
* atividades;
* hospedagem;
* transporte;
* documentos.

---

## UC49 — Pagamento online

Permitir que o participante realize pagamentos diretamente pelo sistema.

---

## UC50 — Venda online da excursão

Permitir que clientes externos conheçam e adquiram excursões diretamente pela aplicação.

---

# 15. Relação com as Regras de Negócio

Os casos de uso deste documento devem ser implementados respeitando as regras definidas em:

`docs/requirements/business-rules.md`

Quando um novo caso de uso for criado, suas regras de negócio correspondentes devem ser identificadas.

Quando uma regra de negócio for alterada, os casos de uso afetados devem ser revisados.

---

# 16. Observação sobre o modelo de domínio

Este documento descreve comportamentos do sistema.

Ele **não define diretamente as tabelas ou entidades do banco de dados**.

O modelo de domínio será definido posteriormente a partir dos conceitos necessários para suportar estes casos de uso.
