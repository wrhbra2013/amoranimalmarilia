# Fluxograma da Aplicação - ONG Amor Animal

## Resumo da Arquitetura

Aplicação Node.js + Express + PostgreSQL para gestão de ONG de proteção animal.

### Estrutura Principal

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE (Browser)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP Request
┌──────────────────────▼──────────────────────────────────────┐
│                  SERVIDOR NODE.JS                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Express.js + Middlewares                           │   │
│  │  - express-session                                  │   │
│  │  - connect-flash                                    │   │
│  │  - cookie-parser                                    │   │
│  │  - multer (uploads)                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ROTAS (20 arquivos)                                │   │
│  │  /           → homeRoutes.js                        │   │
│  │  /auth       → authRoutes.js (login/logout)        │   │
│  │  /adocao     → adocaoRoutes.js                     │   │
│  │  /castracao  → castracaoRoutes.js                  │   │
│  │  /clinicas   → clinicasRoutes.js                   │   │
│  │  /procura_se → procuraRoutes.js                    │   │
│  │  /parceria   → parceriaRoutes.js                   │   │
│  │  /eventos    → eventosRoutes.js                    │   │
│  │  /transparencia → transparenciaRoutes.js           │   │
│  │  /admin      → adminRoutes.js                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DATABASE LAYER                                     │   │
│  │  - database.js (Pool PostgreSQL)                   │   │
│  │  - create.js (DDL - cria tabelas)                  │   │
│  │  - insert.js (DML - inserts)                       │   │
│  │  - queries.js (SELECTs)                            │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQL
┌──────────────────────▼──────────────────────────────────────┐
│              BANCO DE DADOS (PostgreSQL)                    │
│  Tabelas: adocao, castracao, home, eventos,                │
│  adotante, adotado, procura_se, voluntario,                │
│  parceria, transparencia, login, etc.                      │
└─────────────────────────────────────────────────────────────┘
```

## Fluxo de Inicialização

```
[index.js]
    │
    ├──→ initializeDatabase()
    │       ├──→ Conecta ao PostgreSQL
    │       ├──→ Verifica se BD 'espelho' existe
    │       └──→ Cria BD se necessário
    │
    ├──→ initializeDatabaseTables()
    │       ├──→ Cria tabelas (CREATE TABLE IF NOT EXISTS)
    │       ├──→ Executa migrações (ALTER TABLE)
    │       └──→ Cria usuário admin padrão (@admin)
    │
    ├──→ Configura Middlewares
    │       ├──→ express.json()
    │       ├──→ express.urlencoded()
    │       ├──→ cookie-parser()
    │       ├──→ express-session()
    │       ├──→ connect-flash()
    │       └──→ Auth Middleware (req.user, res.locals)
    │
    ├──→ Configura Rotas (app.use('/rota', routes))
    │
    └──→ app.listen(PORT, '0.0.0.0')
            └──→ Servidor ativo em http://0.0.0.0:3000
```

## Fluxo de Autenticação

```
LOGIN
=====
GET /auth/login
    └──→ Verifica req.session.user
        ├──→ Se logado: redirect /home
        └──→ Se não: render login.ejs

POST /auth/login
    └──→ Recebe usuario, senha
        └──→ Query: SELECT FROM login WHERE usuario=? AND senha=?
            ├──→ Não encontrado: render login com erro
            └──→ Encontrado:
                ├──→ req.session.user = {id, usuario, isAdmin}
                ├──→ Se admin: verifica solicitações pendentes
                └──→ redirect /home

LOGOUT
======
GET /auth/logout
    └──→ req.session.user = null
        └──→ flash success
            └──→ redirect /home

MIDDLEWARE isAdmin
==================
Requisição protegida
    └──→ Verifica req.session.user
        ├──→ Não existe: render logar.ejs
        ├──→ Não é admin: 403 Forbidden
        └──→ É admin: next()
```

## Fluxo da Home Page

```
GET / ou /home
    │
    ├──→ checkCookieConsent middleware
    │       └──→ Configura res.locals.cookieConsentLevel
    │
    ├──→ getHomePageData()
    │       ├──→ executeAllQueries()
    │       │       ├──→ SELECT COUNT(*) FROM adocao
    │       │       ├──→ SELECT COUNT(*) FROM adotante
    │       │       ├──→ SELECT COUNT(*) FROM castracao
    │       │       ├──→ SELECT COUNT(*) FROM procura_se
    │       │       ├──→ SELECT COUNT(*) FROM parceria
    │       │       ├──→ SELECT COUNT(*) FROM voluntario
    │       │       ├──→ SELECT COUNT(*) FROM coleta
    │       │       └──→ SELECT * FROM eventos ORDER BY origem DESC LIMIT 6
    │       └──→ Retorna objeto com contagens e dados
    │
    └──→ render home.ejs
            ├──→ Dashboard com cards de estatísticas
            ├──→ Lista de campanhas/notícias
            └──→ Carrossel de eventos
```

## Fluxo de Adoção (CRUD)

```
DASHBOARD
=========
GET /adocao
    ├──→ SELECT * FROM adocao ORDER BY id DESC
    ├──→ SELECT * FROM interessados_adocao
    ├──→ Para cada pet: calculateMatchScore()
    │       ├──→ Espécie compatível: +50 pontos
    │       ├──→ Porte compatível: +30 pontos
    │       └──→ Palavras-chave: +5 pontos cada
    └──→ render adocao_dashboard.ejs

CADASTRO DE PET
===============
GET /adocao/form
    └──→ render form_adocao.ejs

POST /adocao/form
    ├──→ uploadAdocao.fields([arquivo, termo])
    ├──→ Recebe: nome, idade, especie, porte, caracteristicas, tutor, contato, whatsapp
    └──→ insert_adocao(filename, nome, idade, especie, porte, caracteristicas, tutor, contato, whatsapp, termoFilename)
        ├──→ INSERT INTO adocao (...)
        └──→ redirect /adocao com flash success

VISUALIZAÇÃO
============
GET /adocao/:id
    ├──→ SELECT * FROM adocao WHERE id=$1
    └──→ render view_adocao.ejs

DELEÇÃO (Admin)
===============
POST /adocao/delete/:id/:arq
    ├──→ {isAdmin}
    ├──→ SELECT termo_arquivo FROM adocao WHERE id=$1
    ├──→ DELETE FROM adocao WHERE id=$1
    ├──→ Remove arquivo físico (amoranimal_uploads/adocao/)
    └──→ redirect /adocao

ADOCÃO FÍSICA
=============
GET /adocao/fisica
    ├──→ SELECT id, nome, especie FROM adocao ORDER BY nome ASC
    └──→ render adocao_fisica.ejs (cadastro simplificado)

POST /adocao/fisica
    ├──→ uploadAdocao.single('arquivo')
    ├──→ Valores padrão: tutor="Adoção Física", contato="Presencial"
    └──→ insert_adocao(...)
        └──→ redirect /adocao/termo/form?petId=X

TERMO DE RESPONSABILIDADE
==========================
GET /adocao/termo/form?petId=X
    ├──→ SELECT id, nome FROM adocao ORDER BY nome ASC
    └──→ render form_termo_responsabilidade.ejs

POST /adocao/termo/form
    ├──→ uploadTermo.single('arquivo_id')
    ├──→ Recebe: nome, cpf, rg, endereco, contato, whatsapp, email, pet_interesse
    ├──→ INSERT INTO termo_responsabilidade (...)
    └──→ Se petId presente: UPDATE adocao SET termo_arquivo=$1 WHERE id=$2
```

## Fluxo de Castração

```
DASHBOARD
=========
GET /castracao
    ├──→ SELECT * FROM castracao ORDER BY ticket
    ├──→ Agrupa por ticket
    ├──→ Filtra por status (PENDENTE, CONCLUIDO, etc.)
    └──→ render castracao_dashboard.ejs

CADASTRO
========
GET /castracao/form
    └──→ render form_castracao.ejs

POST /castracao/form
    ├──→ Recebe: nome, contato, whatsapp, idade, especie, porte, clinica, agenda
    ├──→ Gera ticket único (UUID)
    ├──→ uploadCastracao.single('arquivo')
    ├──→ INSERT INTO castracao (ticket, nome, contato, whatsapp, arquivo, idade, especie, porte, clinica, agenda, status='PENDENTE')
    └──→ redirect /castracao

ATUALIZAÇÃO DE STATUS
=====================
POST /castracao/status/:id
    ├──→ {isAdmin}
    ├──→ UPDATE castracao SET status=$1 WHERE id=$2
    ├──→ Se status='CONCLUIDO': SET atendido_em=CURRENT_TIMESTAMP
    └──→ redirect /castracao

MUTIRÃO
=======
GET /castracao/mutirao
    ├──→ SELECT * FROM calendario_mutirao
    └──→ render mutirao_castracao.ejs

POST /castracao/mutirao
    ├──→ Recebe: calendario_id, tutor_nome, tutor_contato, vagas_solicitadas
    ├──→ Recebe array de animais (JSON)
    ├──→ INSERT INTO mutirao_castracao (calendario_id, tutor_nome, tutor_contato, vagas_solicitadas, animais, status='PENDENTE')
    └──→ redirect /castracao/mutirao
```

## Fluxo de Eventos

```
LISTAGEM
========
GET /eventos
    ├──→ SELECT * FROM eventos ORDER BY origem DESC
    └──→ render eventos_lista.ejs

CRIAÇÃO (Admin)
===============
GET /eventos/form
    ├──→ {isAdmin}
    └──→ render eventos_form.ejs

POST /eventos/form
    ├──→ {isAdmin}
    ├──→ uploadEventos.single('arquivo')
    ├──→ INSERT INTO eventos (titulo, data_evento, arquivo, descricao)
    └──→ redirect /eventos

VISUALIZAÇÃO
============
GET /eventos/:id
    ├──→ SELECT * FROM eventos WHERE id=$1
    ├──→ SELECT * FROM evento_fotos WHERE evento_id=$1
    ├──→ SELECT * FROM evento_comments WHERE evento_id=$1
    └──→ render eventos_view.ejs

FOTOS (Admin)
=============
POST /eventos/:id/foto
    ├──→ {isAdmin}
    ├──→ uploadEventos.single('foto')
    ├──→ INSERT INTO evento_fotos (evento_id, arquivo, descricao)
    └──→ redirect /eventos/:id

COMENTÁRIOS
===========
POST /eventos/:id/comment
    ├──→ INSERT INTO evento_comments (evento_id, nome, comentario)
    └──→ redirect /eventos/:id
```

## Fluxo de Campanhas (Home/Notícias)

```
LISTAGEM
========
GET /campanha/:id
    ├──→ SELECT * FROM home WHERE id=$1
    ├──→ SELECT * FROM campanha_fotos WHERE campanha_id=$1 ORDER BY id DESC
    ├──→ Para cada foto: SELECT * FROM campanha_foto_comments WHERE foto_id=$1
    └──→ render view_campanha.ejs

CRIAÇÃO (Admin)
===============
GET /campanha/form ou /home/form
    ├──→ {isAdmin}
    └──→ render form_home.ejs

POST /campanha/form
    ├──→ {isAdmin}
    ├──→ uploadHome.single('arquivo')
    ├──→ INSERT INTO home (arquivo, titulo, conteudo, link)
    └──→ redirect /

ADICIONAR FOTOS
===============
GET /campanha/:id/adicionar-foto
    ├──→ {isAdmin}
    ├──→ SELECT id, titulo FROM home WHERE id=$1
    └──→ render campanha_add_foto.ejs

POST /campanha/:id/foto
    ├──→ {isAdmin}
    ├──→ uploadCampanha.single('foto')
    ├──→ Busca info da campanha
    ├──→ Cria subpasta: nome_campanha_data/
    ├──→ Move arquivo para subpasta
    ├──→ INSERT INTO campanha_fotos (campanha_id, arquivo, descricao)
    └──→ redirect /campanha/:id

COMENTÁRIOS
===========
POST /campanha/foto/:id/comment
    ├──→ INSERT INTO campanha_foto_comments (foto_id, nome, comentario)
    └──→ redirect para campanha
```

## Fluxo de Transparência

```
DASHBOARD PÚBLICO
=================
GET /transparencia
    ├──→ SELECT * FROM transparencia ORDER BY ano DESC, tipo
    ├──→ Agrupa por ano e tipo
    └──→ render transparencia_dashboard.ejs

UPLOAD (Admin)
==============
GET /transparencia/form
    ├──→ {isAdmin}
    └──→ render form_transparencia.ejs

POST /transparencia/form
    ├──→ {isAdmin}
    ├──→ uploadTransparencia.single('arquivo')
    ├──→ INSERT INTO transparencia (titulo, tipo, ano, arquivo, descricao)
    └──→ redirect /transparencia

SOLICITAÇÃO DE ACESSO
=====================
POST /transparencia/solicitar
    ├──→ Recebe: nome, organizacao, telefone, email, cpf
    ├──→ INSERT INTO solicitacao_acesso (nome, organizacao, telefone, email, cpf, status='PENDENTE')
    └──→ Flash success

ADMIN - GERENCIAMENTO
=====================
GET /transparencia/admin/solicitacoes
    ├──→ {isAdmin}
    ├──→ SELECT * FROM solicitacao_acesso WHERE status='PENDENTE'
    └──→ Lista solicitações para aprovação
```

## Tabelas do Banco de Dados

### Tabelas Principais
| Tabela | Descrição | Colunas Principais |
|--------|-----------|-------------------|
| **adocao** | Pets para adoção | id, arquivo, nome, idade, especie, porte, caracteristicas, tutor, contato, whatsapp, termo_arquivo, origem |
| **adotante** | Candidatos à adoção | id, origem, q1-q3, qTotal, nome, contato, whatsapp, cep, endereco, cidade, estado, idPet |
| **castracao** | Agendamentos de castração | id, ticket, nome, contato, whatsapp, arquivo, idade, especie, porte, clinica, agenda, status, tipo |
| **home** | Campanhas/notícias | id, origem, arquivo, titulo, mensagem, link |
| **eventos** | Eventos da ONG | id, origem, titulo, data_evento, arquivo, descricao |
| **procura_se** | Animais perdidos | id, origem, arquivo, nomePet, idadePet, especie, local, tutor, contato |
| **parceria** | Parceiros/empresas | id, origem, empresa, localidade, proposta, representante, telefone |
| **voluntario** | Voluntários | id, origem, nome, localidade, telefone, disponibilidade, habilidade |
| **transparencia** | Documentos públicos | id, origem, titulo, tipo, ano, arquivo, descricao |
| **login** | Usuários admin | id, usuario, senha, isAdmin, origem |

### Tabelas de Relacionamento
| Tabela | Descrição | Relação |
|--------|-----------|---------|
| **campanha_fotos** | Fotos adicionais de campanhas | campanha_id → home(id) |
| **campanha_foto_comments** | Comentários em fotos | foto_id → campanha_fotos(id) |
| **evento_fotos** | Fotos de eventos | evento_id → eventos(id) |
| **evento_comments** | Comentários em eventos | evento_id → eventos(id) |
| **interessados_adocao** | Interessados em adotar | - |
| **termo_responsabilidade** | Termos assinados | - |
| **calendario_castracao** | Calendário de castrações | - |
| **calendario_mutirao** | Calendário de mutirões | - |
| **mutirao_castracao** | Inscrições em mutirão | calendario_id → calendario_mutirao(id) |
| **mutirao_inscricao** | Inscrições detalhadas | - |
| **mutirao_pet** | Pets dos mutirões | mutirao_inscricao_id → mutirao_inscricao(id) |
| **solicitacao_acesso** | Solicitações de docs | - |
| **clinicas** | Clínicas parceiras | - |
| **coleta** | Doações/coletas | - |
| **adotado** | Histórias de adoção | - |

## Fluxo de Upload de Arquivos

```
1. Cliente seleciona arquivo
        │
        ▼
2. Multer Middleware
   ├──→ Valida tipo (jpg, jpeg, png, gif, pdf)
   ├──→ Gera nome único (timestamp + random + ext)
   └──→ Determina pasta destino
        │
        ▼
3. Salva arquivo
   ├──→ amoranimal_uploads/home/ (campanhas)
   ├──→ amoranimal_uploads/adocao/ (pets)
   ├──→ amoranimal_uploads/castracao/ (castrações)
   ├──→ amoranimal_uploads/eventos/ (eventos)
   ├──→ amoranimal_uploads/transparencia/ (documentos)
   └──→ amoranimal_uploads/campanha/ (fotos de campanha)
        │
        ▼
4. Salva referência no BD
   └──→ Campo 'arquivo' com nome do arquivo
        │
        ▼
5. Servir arquivo
   └──→ URL: /uploads/nome_do_arquivo
```

## Middleware Pipeline

```
Requisição HTTP
    │
    ├──→ express.json()        // Parse JSON
    │
    ├──→ express.urlencoded()  // Parse form data
    │
    ├──→ cookie-parser()       // Parse cookies
    │
    ├──→ express-session()     // Gerencia sessão
    │       └──→ req.session.user
    │
    ├──→ Auth Middleware       // Popula req.user e res.locals
    │       ├──→ res.locals.user
    │       ├──→ res.locals.isAdmin
    │       └──→ req.isAdmin
    │
    ├──→ connect-flash()       // Mensagens flash
    │       ├──→ res.locals.success_msg
    │       └──→ res.locals.error_msg
    │
    └──→ Router                // Direciona para rota específica
```

## Estrutura de Diretórios

```
/home/wander/Public/amoranimalmarilia/
│
├── index.js                    # Entry point
├── package.json                # Dependências
├── FLUXOGRAMA_APLICACAO.md     # Este arquivo
│
├── database/
│   ├── database.js             # Configuração PostgreSQL (Pool)
│   ├── create.js               # Criação de tabelas (DDL)
│   ├── insert.js               # Inserções (DML)
│   └── queries.js              # Consultas (SELECT)
│
├── routes/                     # Rotas da aplicação
│   ├── homeRoutes.js           # Home e campanhas
│   ├── authRoutes.js           # Login/logout
│   ├── adminRoutes.js          # Criar admin
│   ├── adocaoRoutes.js         # Sistema de adoção
│   ├── adotanteRoutes.js       # Adotantes
│   ├── adotadoRoutes.js        # Histórias de adoção
│   ├── castracaoRoutes.js      # Castrações
│   ├── clinicasRoutes.js       # Clínicas parceiras
│   ├── procuraRoutes.js        # Animais perdidos
│   ├── parceriaRoutes.js       # Parcerias
│   ├── doacaoRoutes.js         # Doações
│   ├── sobreRoutes.js          # Sobre a ONG
│   ├── transparenciaRoutes.js  # Portal transparência
│   ├── relatorioRoutes.js      # Relatórios
│   ├── eventosRoutes.js        # Eventos
│   ├── cepRoutes.js            # Consulta CEP
│   └── errorRoutes.js          # Páginas de erro
│
├── middleware/
│   └── auth.js                 # Middleware de autenticação
│
├── utils/
│   └── multerConfig.js         # Configuração de uploads
│
├── views/                      # Templates EJS (60+ arquivos)
│   ├── home.ejs                # Página inicial
│   ├── adocao_dashboard.ejs    # Dashboard de adoção
│   ├── castracao_dashboard.ejs # Dashboard castração
│   ├── eventos_*.ejs           # Eventos
│   ├── form_*.ejs              # Formulários
│   ├── view_*.ejs              # Visualizações
│   ├── _header.ejs             # Header comum
│   └── _footer.ejs             # Footer comum
│
└── static/                     # Arquivos estáticos
    ├── css/
    ├── js/
    └── images/

(Fora da pasta do projeto)
amoranimal_uploads/             # Uploads de arquivos
├── home/                       # Campanhas
├── adocao/                     # Fotos de pets
├── castracao/                  # Comprovantes
├── eventos/                    # Fotos de eventos
├── transparencia/              # Documentos PDF
└── campanha/                   # Fotos extras de campanhas
```

## Tecnologias e Dependências

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Node.js | - | Runtime |
| Express | ^4.21.2 | Framework web |
| PostgreSQL | - | Banco de dados |
| EJS | ^3.1.10 | Template engine |
| Multer | ^2.0.1 | Upload de arquivos |
| express-session | ^1.18.1 | Sessões |
| connect-flash | ^0.1.1 | Mensagens flash |
| cookie-parser | ^1.4.7 | Cookies |
| pdfmake | ^0.2.20 | Geração de PDFs |
| node-fetch | ^2.7.0 | HTTP client |
| pg | ^8.16.3 | Driver PostgreSQL |

## Configurações Importantes

### Portas
- **Servidor**: 3000 (ou PORT env)
- **PostgreSQL**: 5432

### Variáveis de Ambiente
```bash
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=espelho
DB_USER=postgres
DB_PASSWORD=wander
SESSION_SECRET=<segredo>
NODE_ENV=production
```

### Usuário Admin Padrão
- **Usuário**: @admin
- **Senha**: @admin
- **Criado automaticamente** na inicialização

---

**Gerado em**: 2026-02-12  
**Aplicação**: ONG Amor Animal v1.0.0  
**Autor**: wander-2025
