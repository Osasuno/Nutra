# Nutra — plataforma de atendimento nutricional

Site para várias nutricionistas atenderem seus pacientes. Cada nutricionista cria a própria conta e enxerga apenas os próprios pacientes; os pacientes também criam conta e se vinculam a uma nutricionista.

## Funcionalidades

**Nutricionista**
- **Painel gerencial em cards**: cada paciente é um card com peso e variação, IMC, % de gordura, registros no diário (7 dias), mensagens não lidas, próxima consulta, progresso da anamnese, plano ativo e alertas ("sem registros há X dias", "registros sem feedback"). Filtros (ativos, precisam de atenção, arquivados), busca e ordenação.
- **Prontuário do paciente** com abas: visão geral (gráfico de evolução, resumo clínico, plano, diário, mensagens, anotações), anamnese, avaliações, energia e metas, plano alimentar, diário, chat, evolução clínica e dados/convite.
- **Anamnese completa** (14 seções): identificação e rotina, objetivos, histórico de peso, história clínica (doenças, cirurgias, bariátrica, medicamentos, suplementos, alergias, intolerâncias), histórico familiar, sintomas e digestão (escala de Bristol, diurese, cor da urina, sinais clínicos), estilo de vida (sono, estresse, ansiedade, tabagismo, álcool, atividades), hábitos alimentares, recordatório 24 h, questionário de frequência alimentar, saúde da mulher, exames bioquímicos, exame físico e diagnóstico/conduta. As duas últimas seções são visíveis só para a nutricionista.
- **Avaliações antropométricas**: 12 circunferências, 9 dobras cutâneas ou bioimpedância, com cálculo ao vivo e histórico em gráfico.
- **Energia e metas**: TMB/GET por várias fórmulas, comparação entre elas, fatores clínicos, ajuste do objetivo e distribuição de macronutrientes.
- **Plano alimentar**: refeições com alimentos em gramas e medida caseira, totais por refeição e do dia contra as metas, substituições, ativação para o paciente, duplicação e impressão/PDF.
- **Alimentos**: busca na TACO (597 alimentos com macro e micronutrientes), medidas caseiras do IBGE, produtos industrializados do Open Food Facts e alimentos personalizados.
- **Agenda**: calendário mensal com consultas online e presenciais; confirma, recusa, agenda e reagenda; marca como realizada ou falta; horários de atendimento por dia da semana, duração, antecedência mínima, endereço do consultório e link padrão da videochamada.
- **Calculadoras** avulsas, mensagens (caixa de entrada), código e links de convite e solicitações vindas do diretório.

**Paciente**
- Início com plano do dia, próxima consulta, últimos feedbacks e contato da nutricionista.
- Consultas: solicita (online ou presencial) escolhendo um horário livre, reagenda e cancela respeitando a antecedência mínima; recebe o link da chamada após a confirmação e pode adicionar ao Google Agenda.
- Anamnese para preencher antes da consulta.
- Diário alimentar com foto opcional, fome, saciedade, humor e adesão ao plano; recebe o feedback da nutricionista.
- Chat, plano alimentar (com impressão), evolução das avaliações, diretório de nutricionistas e perfil.

## Fórmulas incluídas

| Área | Fórmulas |
| --- | --- |
| Gasto energético | Mifflin-St Jeor; Harris-Benedict (1919) e revisada (1984); FAO/OMS (1985); Schofield (1985); Katch-McArdle; Cunningham; Tinsley (peso e massa livre de gordura); IOM/DRI 2005 EER (≥ 3 anos) e sobrepeso/obesidade; fórmula de bolso (kcal/kg) |
| Ajustes | Fator atividade, níveis do IOM, fator injúria, fator térmico, adicional de gestação e lactação, déficit/superávit em kcal ou % |
| Composição corporal | Jackson & Pollock 7 e 3 dobras, Durnin & Womersley, Guedes, Faulkner, Slaughter; densidade por Siri ou Brozek; classificação de Lohman |
| Antropometria | IMC (OMS e Lipschitz para idosos), cintura (OMS), RCQ, RCE, índice de conicidade, CMB, AMBc |
| Peso | Peso ideal (IMC 22, faixa saudável, Devine, Robinson, Miller, Hamwi), peso ajustado, adequação (Blackburn & Thornton), perda de peso (Blackburn) |
| Outras | Estatura pela altura do joelho e peso estimado (Chumlea), hidratação (mL/kg, Holliday-Segar, 1 mL/kcal), idade gestacional e DPP, ganho de peso gestacional (IOM 2009), gasto por METs, conversão macro → kcal |

As referências estão no código, em `src/lib/formulas.ts`. As fórmulas apoiam a decisão clínica e não substituem a avaliação profissional.

## Como rodar

Requisitos: Node.js 20.19+, 22.12+ ou 24+.

O banco é PostgreSQL (Supabase). Produção usa o schema `nutra`; o desenvolvimento local usa um schema separado (`nutra_dev`) no mesmo projeto, então os testes locais não tocam nos dados reais.

```bash
npm install          # instala dependências e gera o cliente Prisma
npm run setup        # cria o .env (preencha DATABASE_URL), aplica as migrações e importa TACO + medidas caseiras
npm run db:demo      # opcional: cria contas e dados de demonstração (bloqueado no schema de produção)
npm run dev          # http://localhost:3000
```

Use o **Session pooler** do Supabase (porta 5432); a conexão direta (`db.<ref>.supabase.co`) é só IPv6. A senha precisa ser codificada na URL (`@` vira `%40`). O TLS é verificado com a CA pública do Supabase (`prisma/certs/supabase-ca.crt`).

O `package.json` já autoriza os scripts de instalação necessários (`prisma`, `esbuild`) no campo `allowScripts` do npm 11.

### Contas de demonstração (`npm run db:demo`)

Senha de todas: `demo1234`.

| Conta | E-mail |
| --- | --- |
| Nutricionista (código de convite `DEMO24`) | `nutri@demo.com` |
| Paciente com histórico completo | `paciente@demo.com` |
| Paciente com solicitação pendente | `carla@demo.com` |
| Outra nutricionista (diretório) | `bruno@demo.com` |

Convite pendente de exemplo: `http://localhost:3000/convite/convite-demo-joao`.
Não rode `db:demo` em produção: as senhas são públicas.

### Outros comandos

| Comando | Para quê |
| --- | --- |
| `npm run db:new-migration -- nome` | Gera uma migração após alterar `prisma/schema.prisma` (compara com o banco de desenvolvimento) |
| `npm run db:migrate` | Aplica as migrações pendentes (o Render faz isso em produção a cada deploy) |
| `npm run db:seed` | Reimporta a base de alimentos (pode rodar várias vezes) |
| `npm run db:studio` | Abre o Prisma Studio para ver os dados |
| `npm run lint` | ESLint |
| `npm run build` / `npm start` | Build e servidor de produção |

## Como os vínculos funcionam

- **Código da nutricionista** (ex.: `DEMO24`): o paciente informa no cadastro ou na área dele e entra vinculado na hora.
- **Convite individual**: a nutricionista cadastra o paciente e envia o link `/convite/...` (copiar ou WhatsApp). Ao criar a conta pelo link, o prontuário já existente é vinculado.
- **Diretório**: o paciente encontra a nutricionista e envia uma solicitação, que ela aceita ou recusa no painel.
- Um paciente tem um acompanhamento ativo por vez. Arquivar (nutricionista) ou encerrar (paciente) mantém o histórico.

## Estrutura

```
prisma/
  schema.prisma        modelos do banco
  seed.ts              importa TACO e medidas caseiras (prisma/data/*.csv)
  demo.ts              dados de demonstração
src/
  proxy.ts             redireciona por papel e bloqueia POST de outra origem (CSRF)
  app/                 páginas (nutri/, paciente/, convite/, imprimir/) e rotas /api
  components/          interface (anamnese, plano, diário, chat, calculadoras...)
  lib/
    formulas.ts        todas as fórmulas
    schedule.ts        regras da agenda (horários livres, fuso de Brasília, status)
    appointments.ts    agenda no servidor (conflitos, bloqueio por nutricionista, avisos no chat)
    anamnesis.ts       definição da anamnese (o formulário é gerado a partir dela)
    foods.ts           busca TACO, Open Food Facts e medidas caseiras
    dal.ts, api.ts     autenticação e autorização (acesso por paciente)
```

## Segurança e LGPD

- Senhas com bcrypt; sessão em JWT assinado num cookie `httpOnly` e `SameSite=Lax`.
- Toda leitura e escrita verifica se o paciente pertence à nutricionista logada (ou se é o próprio paciente com vínculo ativo).
- Fotos do diário ficam no banco (tabela `Photo`), são reduzidas no navegador antes do envio e só são servidas a quem tem acesso; o tipo do arquivo é conferido pelo conteúdo.
- As tabelas ficam no schema `nutra`, fora do schema `public` que o Supabase expõe pela API REST dele.
- Campos exclusivos da nutricionista (exame físico, diagnóstico, conduta, anotações) não são enviados ao paciente.
- O paciente dá consentimento LGPD no cadastro. A exclusão do prontuário apaga dados e fotos.
- Limite de tentativas no login, no cadastro e no chat (em memória, por instância).

## Produção (Render + Supabase)

- **Hospedagem**: Render, serviço web `nutra` (região Virgínia, a mesma do banco). Cada push na branch `main` gera um deploy automático.
- **Build**: `npm ci && npx prisma migrate deploy && npm run build`. As migrações novas são aplicadas antes de o site novo entrar no ar.
- **Início**: `npm start`.
- **Variáveis no Render**: `DATABASE_URL` (Session pooler, `?schema=nutra`), `SESSION_SECRET`, `NODE_VERSION=24`. Não defina `NODE_ENV`, porque o `npm ci` deixaria de instalar as dependências de build.
- **Base de alimentos em produção**: importada uma vez com `npm run db:seed` apontando para o schema `nutra`. Rodar de novo não duplica nada.
- **Plano gratuito do Render**: o site "dorme" após 15 min sem acesso e leva cerca de 1 min para acordar. O plano Starter mantém o site sempre ligado.
- **Limites**: o limitador de tentativas fica em memória e o chat atualiza a cada 3 s. Com mais de uma instância, use Redis; para tempo real, WebSocket ou Supabase Realtime. O plano gratuito do Supabase tem 500 MB, e as fotos (cerca de 150–300 KB cada) contam nesse total.

## Fontes dos dados de alimentos

- **TACO**: Tabela Brasileira de Composição de Alimentos, 4ª ed. NEPA/UNICAMP, 2011.
- **Medidas caseiras**: Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil, POF 2008-2009, IBGE, 2011.
- CSVs normalizados obtidos de [brolesi/taco](https://github.com/brolesi/taco) (código MIT; os dados pertencem às fontes originais).
- **Open Food Facts**: consultado online pela [API de busca](https://search.openfoodfacts.org); dados sob licença ODbL. Os valores são colaborativos e devem ser conferidos com o rótulo.

## Ainda não incluído (sugestões)

Recuperação de senha por e-mail, lembretes de consulta por e-mail/WhatsApp, notificações push, pagamentos, exportação da anamnese em PDF, receitas e listas de substituição por grupos, e curvas da OMS para crianças e adolescentes.
