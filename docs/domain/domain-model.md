# Modelo de Domínio — Ciso Excursões

## 1. Objetivo

Este documento define o modelo conceitual do domínio do Ciso Excursões.

O objetivo é identificar os principais conceitos do negócio, suas responsabilidades e seus relacionamentos.

Este documento precede a modelagem física do banco de dados.

O modelo deve ser derivado das regras de negócio e casos de uso definidos em:

* `docs/requirements/business-rules.md`
* `docs/requirements/use-cases.md`

---

# 2. Princípio fundamental

O sistema não deve ser modelado diretamente a partir das planilhas atualmente utilizadas pela Ciso Excursões.

As planilhas representam a forma atual de operação e controle.

O sistema deve representar os conceitos reais do negócio.

---

# 3. Visão geral do domínio

O núcleo do sistema é formado pela relação entre:

```text
Pessoa
   │
   │ participa de
   ▼
Participação
   │
   └──────────► Excursão
```

A `Participação` representa o vínculo entre uma pessoa e uma excursão específica.

A partir da participação são definidos os elementos específicos daquela viagem:

```text
                    ┌── Pagamentos
                    │
                    ├── Acomodação
Participação ───────┼── Transporte / Assento
                    │
                    └── Ingressos
```

A excursão, por sua vez, concentra a configuração operacional:

```text
                         ┌── Ônibus
                         ├── Hotéis / Quartos
Excursão ────────────────┼── Atividades
                         └── Despesas
```

---

# 4. Entidades principais

## 4.1 Pessoa

### Conceito

Representa um indivíduo que pode participar de uma ou mais excursões.

A pessoa existe independentemente de uma excursão.

### Responsabilidade

Armazenar os dados cadastrais permanentes ou relativamente estáveis do indivíduo.

### Principais atributos

* identificador;
* nome completo;
* documento;
* data de nascimento;
* telefone;
* e-mail.

### Relacionamentos

Uma pessoa pode possuir:

```text
Pessoa 1 ─────── N Participações
```

---

# 5. Participação

## 5.1 Conceito

A `Participação` é uma das entidades centrais do domínio.

Ela representa a participação de uma pessoa em uma excursão específica.

Não devemos confundir:

```text
Pessoa
```

com:

```text
Participação
```

A pessoa é o indivíduo.

A participação representa o contexto daquele indivíduo naquela viagem.

### Exemplo

A pessoa:

```text
Maria Silva
```

pode possuir:

```text
Participação
├── Excursão: Carnaval Rio 2026
├── Valor contratado: R$ 2.500
├── Quarto: 203
├── Ônibus: Double Deck 01
└── Atividade: Camarote
```

E posteriormente:

```text
Participação
├── Excursão: Aparecida 2027
├── Valor contratado: R$ 350
├── Quarto: não aplicável
└── Transporte: ônibus 01
```

São duas participações diferentes da mesma pessoa.

### Principais atributos

* identificador;
* pessoa;
* excursão;
* valor contratado;
* situação;
* datas relevantes.

### Relacionamentos

```text
Pessoa 1 ─────── N Participações

Excursão 1 ───── N Participações
```

Existe uma restrição:

```text
Pessoa + Excursão = único
```

Uma pessoa não pode possuir duas participações na mesma excursão.

---

# 6. Excursão

## 6.1 Conceito

Representa uma viagem organizada pela Ciso Excursões.

### Principais atributos

* identificador;
* nome;
* destino;
* data de saída;
* data de retorno;
* valor de referência;
* situação.

### Relacionamentos

Uma excursão possui:

```text
Excursão
├── N Participações
├── N Ônibus
├── N Hotéis
├── N Atividades
└── N Despesas
```

---

# 7. Transporte

O domínio de transporte possui dois conceitos diferentes:

```text
Tipo de Ônibus
       │
       │ define características
       ▼
Ônibus da Excursão
       │
       │ recebe
       ▼
Assentos / Participações
```

Essa separação existe porque:

> "Double Deck 64 lugares" é uma característica/configuração.

Enquanto:

> "Double Deck utilizado na excursão Rio 2027" é uma instância específica da operação.

---

## 7.1 Tipo de Ônibus

Representa uma configuração ou categoria de veículo.

### Exemplos

* Double Deck — 64 lugares;
* ônibus convencional — 46 lugares;
* micro-ônibus — 28 lugares.

### Principais atributos

* identificador;
* nome;
* capacidade;
* características.

---

## 7.2 Ônibus da Excursão

Representa o ônibus efetivamente disponibilizado para uma excursão.

### Relacionamentos

```text
Tipo de Ônibus 1 ───── N Ônibus da Excursão

Excursão 1 ───── N Ônibus da Excursão
```

O ônibus da excursão pode possuir passageiros alocados.

---

## 7.3 Assento

No modelo inicial, não será criada necessariamente uma entidade independente `Assento`.

O assento pode ser representado como uma posição dentro do ônibus da excursão.

Exemplo:

```text
Ônibus 01
├── Assento 01 → João
├── Assento 02 → Maria
├── Assento 03 → disponível
└── ...
```

A participação possuirá a informação do assento atribuído.

### Restrição

Não pode existir:

```text
Ônibus 01 + Assento 15
```

atribuído simultaneamente a duas participações ativas.

### Evolução futura

Caso o mapa físico dos ônibus exija maior complexidade, poderemos criar uma entidade específica `Assento`.

---

# 8. Hospedagem

A hospedagem possui três conceitos principais:

```text
Hotel
  │
  ▼
Hotel na Excursão
  │
  ▼
Quarto
  │
  ▼
Participação
```

---

## 8.1 Hotel

Representa um estabelecimento de hospedagem.

### Responsabilidade

Armazenar informações reutilizáveis sobre o hotel.

### Relacionamentos

Um hotel pode participar de diversas excursões.

```text
Hotel 1 ───── N Configurações de hospedagem
```

---

## 8.2 Hotel na Excursão

Representa a utilização de determinado hotel em uma excursão específica.

Essa separação é importante porque as condições comerciais podem mudar entre excursões.

### Exemplos

O mesmo hotel pode:

```text
Carnaval 2026
→ custo negociado A

Carnaval 2027
→ custo negociado B
```

### Relacionamentos

```text
Excursão 1 ───── N Hotéis utilizados

Hotel 1 ───── N Excursões
```

---

## 8.3 Quarto

Representa uma unidade de acomodação disponibilizada para a excursão.

### Principais atributos

* identificador;
* identificação do quarto;
* tipo;
* capacidade;
* custo operacional.

### Relacionamentos

Um quarto pertence à configuração de hospedagem de uma excursão.

```text
Hotel na Excursão 1 ───── N Quartos
```

Um quarto pode possuir várias participações, respeitando sua capacidade.

```text
Quarto 1 ───── N Participações
```

---

# 9. Atividades

## 9.1 Atividade

Representa uma atividade opcional ou gratuita oferecida durante uma excursão.

### Exemplos

* escola de samba;
* Cristo Redentor;
* passeio;
* evento;
* atração turística.

### Relacionamentos

```text
Excursão 1 ───── N Atividades
```

Uma atividade pertence a uma excursão específica.

---

# 10. Tipos de ingresso

## 10.1 Tipo de Ingresso

Representa uma modalidade de ingresso disponível para determinada atividade.

### Exemplo

```text
Atividade: Evento X

Tipos:
├── Pista — R$ 150
├── Camarote — R$ 300
└── Área VIP — R$ 450
```

### Relacionamento

```text
Atividade 1 ───── N Tipos de Ingresso
```

O preço atual do tipo de ingresso pode mudar.

Entretanto, essa alteração não pode modificar compras já realizadas.

---

# 11. Compra de ingresso do participante

## 11.1 Compra de Ingresso

Representa a aquisição de um ingresso por uma participação.

É importante separar:

```text
Tipo de Ingresso
```

de:

```text
Compra de Ingresso
```

Porque o tipo de ingresso representa a oferta atual.

A compra representa aquilo que foi efetivamente contratado pelo participante.

### Exemplo

Hoje:

```text
Camarote
Preço atual: R$ 300
```

João compra:

```text
Compra
Preço vendido: R$ 300
```

Posteriormente:

```text
Camarote
Preço atual: R$ 350
```

A compra de João continua:

```text
Preço vendido: R$ 300
```

### Relacionamentos

```text
Participação 1 ───── N Compras de Ingresso

Atividade 1 ───── N Compras de Ingresso

Tipo de Ingresso 1 ───── N Compras de Ingresso
```

### Restrição

Uma participação pode possuir no máximo uma compra para determinada atividade.

---

# 12. Compra de ingressos com fornecedor

O sistema também precisa representar a operação inversa:

```text
Participantes
      ↓
Demanda
      ↓
Quantidade necessária
      ↓
Compra com fornecedor
```

Essa operação é diferente da compra realizada pelo participante.

Portanto, futuramente teremos um conceito separado para representar a aquisição dos ingressos pelo responsável da excursão.

### Conceito inicial

`Compra de Ingressos do Fornecedor`

Esse conceito deverá permitir controlar:

* atividade;
* tipo de ingresso;
* quantidade necessária;
* quantidade adquirida;
* custo unitário;
* custo total;
* fornecedor;
* data da compra.

O nome definitivo da entidade será definido durante o modelo financeiro.

---

# 13. Pagamento

## 13.1 Conceito

Representa um valor efetivamente pago por um participante.

Um pagamento sempre precisa indicar sua finalidade.

### Finalidades atuais

```text
Pagamento
├── Pacote da excursão
└── Ingresso específico
```

### Principais atributos

* identificador;
* data;
* valor;
* método;
* finalidade.

### Relacionamentos

Todo pagamento pertence a uma participação.

Um pagamento destinado a ingresso também deve identificar a compra de ingresso correspondente.

---

# 14. Reembolso

## 14.1 Conceito

Representa um valor devolvido ao participante.

O reembolso não deve apagar o pagamento original.

Exemplo:

```text
Pagamento
R$ 1.000

Reembolso
R$ 700
```

O histórico permanece:

```text
Pagamento original: R$ 1.000
Reembolso: R$ 700
```

Isso permite preservar a rastreabilidade financeira.

---

# 15. Despesa

## 15.1 Conceito

Representa um custo relacionado à realização de uma excursão.

### Exemplos

* hotel;
* transporte;
* alimentação;
* brindes;
* seguro;
* ingressos;
* outros custos.

### Relacionamento

```text
Excursão 1 ───── N Despesas
```

### Principais atributos

* identificador;
* categoria;
* descrição;
* valor;
* data.

---

# 16. Relacionamentos principais

O modelo conceitual pode ser resumido da seguinte maneira:

```text
                         ┌──────────────────┐
                         │     Pessoa       │
                         └────────┬─────────┘
                                  │
                                  │ 1:N
                                  ▼
                         ┌──────────────────┐
                         │  Participação   │
                         └────────┬─────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
          Acomodação         Transporte       Pagamentos
                 │                │
                 ▼                ▼
               Quarto           Ônibus
                                  │
                                  ▼
                              Assento


                         ┌──────────────────┐
                         │    Excursão      │
                         └────────┬─────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
          Hotéis              Atividades           Despesas
             │                    │
             ▼                    ▼
          Quartos           Tipos de Ingresso
                                  │
                                  ▼
                         Compras de Ingresso
                                  │
                                  ▼
                              Participação
```

---

# 17. Entidades identificadas

O modelo conceitual inicial possui os seguintes conceitos:

### Núcleo

1. Pessoa
2. Excursão
3. Participação

### Transporte

4. Tipo de Ônibus
5. Ônibus da Excursão

### Hospedagem

6. Hotel
7. Hotel na Excursão
8. Quarto

### Atividades

9. Atividade
10. Tipo de Ingresso
11. Compra de Ingresso
12. Compra de Ingressos do Fornecedor

### Financeiro

13. Pagamento
14. Reembolso
15. Despesa

---

# 18. Conceitos deliberadamente não modelados ainda

Alguns conceitos foram identificados, mas não serão transformados em entidades neste momento.

## Assento

Inicialmente será representado como uma posição dentro do ônibus da excursão.

Uma entidade própria poderá ser criada caso o mapa físico dos veículos exija isso.

## Grupo de viagem

Famílias e amigos podem querer viajar juntos.

Essa necessidade existe operacionalmente, mas ainda não foi definida como requisito obrigatório do sistema.

Portanto, não será criada uma entidade `Grupo` neste momento.

## Crédito

Créditos decorrentes de cancelamentos foram identificados como necessidade futura.

O conceito será detalhado antes de entrar no modelo principal.

---

# 19. Regras de integridade do domínio

O modelo deve respeitar, no mínimo:

* uma pessoa pode possuir várias participações;
* uma pessoa não pode possuir duas participações na mesma excursão;
* uma excursão possui várias participações;
* uma participação possui um único valor contratado;
* uma participação pode ou não possuir transporte;
* uma participação deve possuir acomodação antes da confirmação operacional;
* uma participação não pode ocupar dois quartos simultaneamente;
* um quarto não pode ultrapassar sua capacidade;
* um assento não pode ser ocupado por duas participações ativas;
* uma atividade pode possuir vários tipos de ingresso;
* uma participação pode possuir no máximo um ingresso por atividade;
* o preço vendido do ingresso deve ser preservado;
* um pagamento deve possuir finalidade;
* reembolsos não devem apagar pagamentos;
* despesas pertencem a uma excursão.

---

# 20. Decisões ainda pendentes

O modelo ainda possui algumas decisões que deverão ser refinadas antes da criação do banco de dados:

1. Estados possíveis de uma participação;
2. Estados possíveis de uma excursão;
3. Estados de uma compra de ingresso;
4. Como representar exatamente a compra de ingressos com fornecedores;
5. Como registrar fornecedores;
6. Como representar histórico de alterações de valores;
7. Regras detalhadas de reembolso;
8. Modelo de fechamento financeiro;
9. Necessidade de grupos de viagem;
10. Necessidade de entidade própria para assentos.

Essas decisões serão analisadas antes da modelagem física do banco.

---

# 21. Regra para evolução do modelo

Uma nova entidade não deve ser criada apenas porque existe uma informação nova.

Antes de criar um novo conceito, devemos verificar:

1. Existe uma regra de negócio associada?
2. Existe comportamento próprio?
3. Possui ciclo de vida?
4. Possui relacionamentos próprios?
5. Precisa ser consultada ou alterada independentemente?
6. Sua ausência prejudicaria a representação correta do domínio?

Se a resposta for não, a informação provavelmente pertence a uma entidade já existente.

---

# 22. Próximo passo

Após a validação deste modelo conceitual, o próximo passo será criar o diagrama visual do domínio e, posteriormente, transformar o modelo conceitual em um modelo de dados para PostgreSQL.
