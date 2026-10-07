# Ciso Excursões

Sistema de gestão de excursões desenvolvido para a Ciso Excursões.

O objetivo do projeto é substituir o controle atualmente realizado por planilhas e centralizar a operação das excursões em uma aplicação web.

## Objetivos

O sistema deverá permitir o gerenciamento de:

* Excursões
* Passageiros
* Participações em excursões
* Transporte e assentos
* Hotéis e acomodações
* Atividades e ingressos
* Pagamentos
* Cancelamentos e reembolsos
* Despesas
* Resultados financeiros
* Relatórios operacionais

## Princípios do projeto

### Domínio antes da implementação

As regras de negócio serão definidas e documentadas antes da implementação das funcionalidades correspondentes.

### Documentação como fonte da verdade

Decisões importantes de negócio e arquitetura deverão ser documentadas no repositório e versionadas junto ao código.

### Evolução incremental

O sistema será desenvolvido inicialmente como um produto operacional para a Ciso Excursões, evitando complexidade desnecessária.

### Arquitetura

A aplicação será inicialmente desenvolvida como um **Modular Monolith**, permitindo futura evolução caso necessidades reais de escala ou independência entre módulos apareçam.

## Documentação

A documentação do projeto está organizada em:

* `docs/requirements/` — requisitos e regras de negócio
* `docs/domain/` — modelo e conceitos do domínio
* `docs/architecture/` — arquitetura da aplicação
* `docs/architecture/decisions/` — decisões arquiteturais (ADRs)
* `docs/changelog.md` — histórico de mudanças relevantes

## Status

**Em fase de definição do domínio e requisitos.**
