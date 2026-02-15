# Fluxograma Geral do Sistema Amor Animal Marília

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVIDOR (Node.js + Express)                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        MIDDLEWARES                                   │   │
│  │  • Express Session (gerenciamento de sessões)                      │   │
│  │  • Cookie Parser (parse de cookies)                                 │   │
│  │  • Flash Messages (mensagens temporárias)                           │   │
│  │  • Authentication (isAdmin - verificação de admin)                  │   │
│  │  • Multer (upload de arquivos)                                      │   │
│  │  • Static Files (CSS, JS, imagens)                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        BANCO DE DADOS                                │   │
│  │                     (PostgreSQL)                                     │   │
│  │  • Tabelas: adocao, adotante, adotado, castracao,                   │   │
│  │    clinicas, procura_se, parceria, doacao, home,                     │   │
│  │    eventos, calendario_castracao, calendario_mutirao,                │   │
│  │    mutirao_inscricao, mutirao_pet, interessados_adocao,             │   │
│  │    termo_responsabilidade, login, etc.                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROTAS DO SISTEMA                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. HOME / DASHBOARD (/)                                                     │
│                                                                             │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                 │
│    │   Notícias   │    │   Eventos    │    │  Estatísticas│                 │
│    │  (Campanhas) │    │  (Carrossel) │    │   (Contadores) │                │
│    └──────────────┘    └──────────────┘    └──────────────┘                 │
│                                                                             │
│    Funcionalidades:                                                         │
│    • Listar campanhas/notícias                                             │
│    • Ver detalhes de campanha                                              │
│    • Upload de fotos adicionais em campanhas                               │
│    • Comentários em fotos de campanhas                                     │
│    • Exibir eventos recentes                                              │
│    • Exibir contadores de: adoção, adotante, adotado,                      │
│      castração, procura_se, parceria, voluntário, coleta                    │
│                                                                             │
│    [Admin] Criar/editar campanhas                                           │
│    [Admin] Adicionar fotos a campanhas                                     │
│    [Admin] Deletar campanhas                                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. ADOÇÃO (/adocao)                                                        │
│                                                                             │
│    ┌──────────────────────────────────────────────────────────────────┐    │
│    │                      DASHBOARD DE ADOÇÃO                         │    │
│    │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │    │
│    │  │   Pets    │  │ Interessados│  │  Matching  │  │  Termos   │  │    │
│    │  │  (Lista)  │  │  (Candidatos)│ │ (Sistema) │  │ (Responsab.)│  │    │
│    │  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │    │
│    └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (dashboard) - Lista pets + interessados + matching               │
│    ├── /form - Formulário de cadastro de pet                              │
│    ├── /form (POST) - Processa cadastro de pet                            │
│    ├── /:id - Detalhes do pet                                             │
│    ├── /delete/:id/:arq - Deletar pet [Admin]                             │
│    ├── /compatibilidade - Análise de matching geral                       │
│    ├── /match/:id - Matching específico de um pet                        │
│    ├── /fisica - Adoção física (cadastro simplificado)                    │
│    ├── /fisica (POST) - Processa adoção física                           │
│    ├── /interessados/form - Formulário de candidato à adoção             │
│    ├── /interessados/form (POST) - Registra interesse                    │
│    ├── /termo/form - Formulário de termo de responsabilidade            │
│    └── /termo/form (POST) - Processa termo                               │
│                                                                             │
│    Sistema de Matching:                                                    │
│    • Calcula compatibilidade (espécie, porte, características)           │
│    • Pontuação por critérios                                               │
│    • Lista candidatos compatíveis                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. CASTRACAO (/castracao)                                                  │
│                                                                             │
│    ┌──────────────────────────────────────────────────────────────────┐    │
│    │                    DASHBOARD DE CASTRACAO                        │    │
│    │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │    │
│    │  │  Registro  │  │ Mutirão   │  │Calendário │  │  Clínicas │  │    │
│    │  │  (Geral)   │  │(Eventos)  │  │ (Datas)   │  │ (Parcerias)│  │    │
│    │  └────────────┘  └────────────┘  └────────────┘  └───────────┘  │    │
│    └──────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (dashboard) - Visão geral                                        │
│    ├── /form - Formulário de castração                                     │
│    ├── /form (POST) - Processa castração                                  │
│    ├── /lista - Lista de castrações                                       │
│    ├── /baixo-custo - Formulário castração baixo custo                   │
│    ├── /pets-rua - Formulário castração pets de rua                       │
│    ├── /calendario - Calendário de castrações [Admin]                    │
│    ├── /calendario (POST) - Criar data de castração [Admin]              │
│    ├── /calendario-mutirao - Calendário de mutirões                       │
│    ├── /calendario-mutirao (POST) - Criar mutirão [Admin]                │
│    ├── /mutirao-inscricao/:id - Formulário inscrição mutirão             │
│    ├── /mutirao-inscricao (POST) - Processa inscrição mutirão            │
│    ├── /mutirao-inscricao/sucesso/:id - Página de sucesso               │
│    ├── /mutirao-inscricao/comprovante/:id - Gera PDF comprovante         │
│    ├── /mutirao/inscrever/:id - Inscrição em mutirão específico         │
│    ├── /mutirao/create (POST) - Cria inscrição mutirão                  │
│    ├── /delete/:id/:arq - Deletar registro [Admin]                        │
│    ├── /updateStatus/:id - Atualizar status para ATENDIDO                 │
│    ├── /calendario-mutirao/relatorio/:id - Relatório PDF mutirão [Admin]│
│    └── /:id - Detalhes do registro                                        │
│                                                                             │
│    Funcionalidades Especiais:                                              │
│    • Geração automática de tickets sequenciais (CAAAA0000)               │
│    • Suporte a múltiplos pets por inscrição                               │
│    • Geração de comprovante em PDF                                       │
│    • Controle de vagas em mutirões                                        │
│    • Relatório de mutirão em PDF                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. CLINICAS (/clinicas)                                                    │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (lista) - Lista de clínicas parceiras                            │
│    ├── /form - Formulário de cadastro de clínica                         │
│    ├── /form (POST) - Processa cadastro                                   │
│    └── /:id - Detalhes da clínica                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. PROCURA SE (/procura_se) - Pet Desaparecido                           │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (lista) - Lista de pets procurados                               │
│    ├── /form - Formulário de registro                                      │
│    ├── /form (POST) - Processa registro                                   │
│    ├── /delete/:id/:arq - Deletar registro [Admin]                        │
│    └── /:id - Detalhes do registro                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. ADOTANTE (/adotante)                                                    │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (lista) - Lista de adotantes                                     │
│    ├── /form - Formulário de cadastro                                      │
│    ├── /form (POST) - Processa cadastro                                   │
│    ├── /delete/:id - Deletar adotante [Admin]                             │
│    └── /:id - Detalhes do adotante                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. ADOTADO (/adotado)                                                      │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (lista) - Lista de pets adotados                                 │
│    ├── /form - Formulário de registro                                      │
│    ├── /form (POST) - Processa registro                                   │
│    ├── /delete/:id - Deletar registro [Admin]                             │
│    └── /:id - Detalhes do registro                                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 8. DOACAO (/doacao)                                                        │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (página) - Página de doações                                     │
│    └── /form - Formulário de doação                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 9. PARCERIA (/parceria)                                                   │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (página) - Página de parcerias                                   │
│    └── /form - Formulário de parceria                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 10. EVENTOS (/eventos)                                                     │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (lista) - Lista de eventos                                       │
│    ├── /form - Formulário de evento [Admin]                               │
│    ├── /form (POST) - Processa evento [Admin]                            │
│    ├── /delete/:id - Deletar evento [Admin]                              │
│    └── /:id - Detalhes do evento                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 11. TRANSPARENCIA (/transparencia)                                         │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (página) - Página de transparência                               │
│    └── /form - Formulário de registro [Admin]                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 12. RELATORIO (/relatorio)                                                 │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── / (página) - Página de relatórios                                  │
│    └── /* (PDFs) - Diversos relatórios em PDF                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 13. ADMIN (/admin)                                                         │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── /form - Criar novo administrador                                   │
│    └── /form (POST) - Processa criação de admin                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 14. AUTENTICACAO (/auth)                                                   │
│                                                                             │
│    Sub-rotas:                                                               │
│    ├── /login - Página de login                                           │
│    ├── /login (POST) - Processa login                                    │
│    └── /logout - Realiza logout                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 15. UTILITARIOS                                                            │
│                                                                             │
│    /cep - Busca de CEP                                                     │
│    /cookie-consent - Consentimento de cookies                             │
│    /accept-cookies (POST) - Aceitar cookies                              │
│    /error - Página de erro                                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 16. SOBRE / PRIVACIDADE                                                    │
│                                                                             │
│    /sobre - Página institucional                                          │
│    /privacy - Política de privacidade                                      │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE DADOS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         UPLOAD DE ARQUIVOS                                  │
│                                                                             │
│    ┌────────────┐     ┌────────────┐     ┌────────────┐                  │
│    │  Multer    │────▶│  Arquivos  │────▶│  Banco de  │                  │
│    │ (Middleware)│     │  (uploads/)│     │   Dados    │                  │
│    └────────────┘     └────────────┘     └────────────┘                  │
│                                                                             │
│    Diretórios de upload:                                                   │
│    • /uploads/adocao/       - Fotos de pets para adoção                   │
│    • /uploads/castracao/    - Comprovantes de castração                   │
│    • /uploads/procura_se/   - Fotos de pets procurados                   │
│    • /uploads/home/         - Imagens de campanhas                        │
│    • /uploads/campanha/     - Fotos adicionais de campanhas               │
│    • /uploads/termo/        - Termos de responsabilidade                  │
│    • /amoranimal_uploads/   - Diretório externo para produção            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         SESSAO E AUTENTICACAO                              │
│                                                                             │
│    ┌────────────┐     ┌────────────┐     ┌────────────┐                  │
│    │   Login    │────▶│  Sessao    │────▶│  Cookies   │                  │
│    │  (Form)    │     │  (Express) │     │ (HTTP Only)│                  │
│    └────────────┘     └────────────┘     └────────────┘                  │
│                                                                             │
│    Dados na sessão:                                                         │
│    • user: { id, usuario, isAdmin, ... }                                 │
│    • isAdmin: boolean                                                      │
│    • cookieConsent: 'essential' | 'all'                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO PRINCIPAL: ADOÇÃO                            │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │   Visitante  │     │  Interessado │     │   Admin      │
    │   (Público)  │     │  (Candidato)  │     │  (Sistema)   │
    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │  Visualiza  │     │  Registra   │     │  Gerencia   │
    │   Pets       │     │   Interesse │     │   Sistema   │
    │  Disponíveis│     │  (Matching) │     │  (CRUD)     │
    └──────────────┘     └──────────────┘     └──────────────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │   Matching   │
                        │   System     │
                        │ (Algoritmo) │
                        └──────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │   Dashboard  │
                        │    Adoção    │
                        └──────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO PRINCIPAL: CASTRACAO                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │   Tutor      │     │    Admin     │     │   Sistema    │
    │  (Solicitante)│     │  (Gestao)   │     │  (Automático)│
    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │  Preenche   │     │  Cria Dates  │     │ Gera Tickets │
    │ Formulário  │     │  no Calend.  │     │  Sequenciais │
    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │    Banco     │
                        │    Dados     │
                        └──────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │   Dashboard  │
                        │  Castração   │
                        └──────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    MATRIZ DE PERMISSOES                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┬──────────────┬──────────────┬──────────────────────┐
│      Rota          │   Público    │   Usuário    │       Admin          │
├────────────────────┼──────────────┼──────────────┼──────────────────────┤
│ / (Home)           │     ✓        │      ✓       │         ✓             │
│ /adocao            │     ✓        │      ✓       │         ✓             │
│ /adocao/form       │     ✓        │      ✓       │         ✓             │
│ /adocao/delete     │     ✗        │      ✗       │         ✓             │
│ /castracao         │     ✓        │      ✓       │         ✓             │
│ /castracao/form    │     ✓        │      ✓       │         ✓             │
│ /castracao/calendario│   ✗        │      ✗       │         ✓             │
│ /procura_se        │     ✓        │      ✓       │         ✓             │
│ /procura_se/form   │     ✓        │      ✓       │         ✓             │
│ /doacao            │     ✓        │      ✓       │         ✓             │
│ /parceria          │     ✓        │      ✓       │         ✓             │
│ /eventos           │     ✓        │      ✓       │         ✓             │
│ /eventos/form      │     ✗        │      ✗       │         ✓             │
│ /admin             │     ✗        │      ✗       │         ✓             │
│ /admin/form        │     ✗        │      ✗       │         ✓             │
│ /auth/login        │     ✓        │      ✗       │         ✗             │
│ /auth/logout       │     ✗        │      ✓       │         ✓             │
│ /relatorio         │     ✗        │      ✗       │         ✓             │
│ /transparencia     │     ✓        │      ✓       │         ✓             │
│ /transparencia/form│     ✗        │      ✗       │         ✓             │
└────────────────────┴──────────────┴──────────────┴──────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    TABELAS DO BANCO DE DADOS                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┬──────────────────────────────────────────────────────┐
│      Tabela         │                   Descrição                        │
├────────────────────┼──────────────────────────────────────────────────────┤
│ login              │ Usuários administrators                              │
│ adocao             │ Pets disponíveis para adoção                         │
│ adotante           │ Registros de adotantes                              │
│ adotado            │ Pets que foram adotados                              │
│ castracao          │ Registros de castrações                             │
│ clinicas           │ Clínicas parceiras                                  │
│ parceria           │ Registros de parcerias                              │
│ doacao             │ Registros de doações                                │
│ home               │ Campanhas/notícias da home                          │
│ campanha_fotos     │ Fotos adicionais de campanhas                       │
│ campanha_foto_comments│ Comentários em fotos de campanhas              │
│ eventos            │ Eventos da organização                               │
│ calendario_castracao │ Datas de castração disponíveis                    │
│ calendario_mutirao │ Datas de mutirões de castração                      │
│ mutirao_inscricao  │ Inscrições em mutirões                              │
│ mutirao_pet        │ Pets inscritos em mutirões                          │
│ procura_se         │ Pets procurados (desaparecidos)                     │
│ voluntarios        │ Registro de voluntários                             │
│ coleta             │ Dados de coleta                                     │
│ interessados_adocao│ Candidatos à adoção                                 │
│ termo_responsabilidade│ Termos de responsabilidade assinados         │
└────────────────────┴──────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    TECNOLOGIAS UTILIZADAS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

• Backend: Node.js + Express.js
• Banco de Dados: PostgreSQL
• Template Engine: EJS
• Upload de Arquivos: Multer
• Sessões: express-session
• Mensagens Flash: connect-flash
• Geração de PDF: pdfmake
• Frontend: HTML, CSS, JavaScript (Vanilla)
• Ícones: Font Awesome
• Imagens:処理 (Processamento de imagens para upload)
