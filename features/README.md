# features/

Uma pasta por feature do backlog (`features/inicio/`, `features/cabine/`…).
Dentro dela ficam os componentes, as Server Actions, as regras e os testes
daquela feature.

- Uma feature não importa de outra: o que é compartilhado sobe para `design/`
  (visual) ou `lib/` (lógica).
- Nenhuma feature fala com o Prisma. Toda leitura e escrita passa por
  `lib/data/`, que confere a permissão (regra de segurança 1).
- Teste de regra de negócio mora aqui, ao lado do código, e cita o código da RN.
