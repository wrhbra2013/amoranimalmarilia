// NPM Modules
 const path = require("path");
 const express = require('express');
 const session = require('express-session');
 const flash = require('connect-flash');
 const cookieParser = require("cookie-parser");
 
 // Local Modules
 const { initializeDatabase } = require('./database/database.js');
 const { initializeDatabaseTables } = require('./database/create.js');
 // const { executeAllQueries } = require('./database/queries'); // Se usado apenas para verificação inicial, pode ser opcional aqui
 
 // --- Express App Setup ---
 const app = express();
 const PORT = process.env.PORT || 3000;
 
 // --- Middleware ---
 // Substitui bodyParser.urlencoded e bodyParser.json
 app.use(express.urlencoded({ extended: true }));
 app.use(express.json());
 app.use(cookieParser());
  


 
 // Session middleware setup
 // IMPORTANTE: Defina process.env.SESSION_SECRET em seu ambiente de produção!
 const sessionSecret = process.env.SESSION_SECRET || '@admin_c80eaa705b089b9d541ffce85a72fc19bdc3c21fcd60e5d27c097c895948b7d7085cdb06dea1f3c1e37a7d835f42acb7f2b5cd8240597cf9597f47f60dabe85c ';
 if (sessionSecret === '@admin_c80eaa705b089b9d541ffce85a72fc19bdc3c21fcd60e5d27c097c895948b7d7085cdb06dea1f3c1e37a7d835f42acb7f2b5cd8240597cf9597f47f60dabe85c' && process.env.NODE_ENV === 'production') {
     console.warn('AVISO: SESSION_SECRET não está configurada adequadamente para produção!');
 }

 if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Confia no primeiro proxy (comum para Render, Heroku, etc.)
}
 app.use(session({
     secret: sessionSecret,
     resave: false,
     saveUninitialized: true,
     cookie: {
         secure: process.env.NODE_ENV === 'production', // Use cookies seguros em produção (HTTPS)
         httpOnly: true, // Ajuda a prevenir ataques XSS
         // maxAge: 24 * 60 * 60 * 1000 // Opcional: define o tempo de vida do cookie da sessão (ex: 1 dia)
     }
 }));
 
 
 
 // Middleware para disponibilizar informações do usuário e estado do cookie para as views
// 2. Middleware para popular req.user e req.isAdmin a partir da sessão
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        req.user = req.session.user;
        req.isAdmin = req.session.user.isAdmin;
        // Opcional: tornar user e isAdmin disponíveis globalmente para todos os templates via res.locals
        res.locals.user = req.session.user;
        res.locals.isAdmin = req.session.user.isAdmin;
    } else {
        // Garante que req.isAdmin seja false se não houver usuário logado
        // e que res.locals.isAdmin também seja false para os templates.
        req.isAdmin = false;
        if (res.locals) { // Garante que res.locals exista
            res.locals.isAdmin = false;
            res.locals.user = null;
        }
        // console.log(`[${req.method} ${req.path}] MIDDLEWARE - Sem usuário na sessão. isAdmin=false`); // LOG ADICIONADO
    }
    next();
});

 
 // --- View Engine Setup ---
 app.set('view engine', 'ejs');
 app.set('views', path.join(__dirname, 'views')); // Corrigido: app.set('views', ...)
 
 // --- Static Files ---
 // Servir arquivos estáticos da aplicação (CSS, JS, imagens do tema)
 app.use('/static', express.static(path.join(__dirname, 'static')));
 // Servir arquivos da pasta de uploads, que agora está fora da pasta da aplicação.
 app.use('/uploads', express.static(path.join(__dirname, '..', 'amoranimal_uploads')));
 
 // Inicializa o connect-flash
 app.use(flash());

// Middleware para tornar as mensagens flash disponíveis em todas as views/templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); // Passport.js pode usar 'error'
    next();
});

 // --- Routes ---
 
 // Importação de Rotas
 const homeRoutes = require('./routes/homeRoutes');
 const adocaoRoutes = require('./routes/adocaoRoutes');
 const adotanteRoutes = require('./routes/adotanteRoutes');
 const adotadoRoutes = require('./routes/adotadoRoutes');
 const clinicasRoutes = require('./routes/clinicasRoutes');
 const castracaoRoutes = require('./routes/castracaoRoutes');
 const procuraRoutes = require('./routes/procuraRoutes');
 const parceriaRoutes = require('./routes/parceriaRoutes');
 const doacaoRoutes = require('./routes/doacaoRoutes');
 const sobreRoutes = require('./routes/sobreRoutes');
 const privacyRoutes = require('./routes/privacyRoutes');
 const cepRoutes = require('./routes/cepRoutes');
 const authRoutes = require('./routes/authRoutes'); // Para login/logout
 const adminRoutes = require('./routes/adminRoutes');
 const transparenciaRoutes = require('./routes/transparenciaRoutes');
 const relatorioRoutes = require('./routes/relatorioRoutes');
 const errorRoutes = require('./routes/errorRoutes'); // Se for uma página de erro específica
const eventosRoutes = require('./routes/eventosRoutes');

 
 // Montagem das Rotas
 app.use('/', homeRoutes); // homeRoutes já lida com '/' e '/home' internamente
 // app.use('/home', homeRoutes); // Redundante se homeRoutes já trata /home
 app.use('/adote', adocaoRoutes); // Mantido para consistência, mas '/adocao' é mais comum
 app.use('/adocao', adocaoRoutes);
 app.use('/adotante', adotanteRoutes);
 app.use('/adotado', adotadoRoutes);
 app.use('/castracao', castracaoRoutes);
 app.use('/clinicas', clinicasRoutes);
 app.use('/procura_se', procuraRoutes);
 app.use('/parceria', parceriaRoutes);
 app.use('/doacao', doacaoRoutes);
 app.use('/sobre', sobreRoutes);
 app.use('/privacy', privacyRoutes);
 app.use('/cep', cepRoutes);
 app.use('/auth', authRoutes); // Monta authRoutes na raiz para ter /login, /logout
 app.use('/admin', adminRoutes);
 app.use('/transparencia', transparenciaRoutes);
 app.use('/relatorio', relatorioRoutes);
app.use('/eventos', eventosRoutes);
 
 
 // Rotas para consentimento de cookies
 app.get('/cookie-consent', (req, res) => { // Esta rota deve vir ANTES do 404
     res.render('cookie-consent'); // Supondo que você tenha um 'cookie-consent.ejs'
 });
 
app.post('/accept-cookies', (req, res) => { // Esta rota deve vir ANTES do 404
    // Permite receber { level: 'essential' | 'all' } do cliente
    const level = req.body && req.body.level ? String(req.body.level) : 'essential';
    // Armazena o consentimento na sessão atual (req.session) em vez de cookie persistente
    if (req.session) {
        req.session.cookieConsent = level;
    }
    res.sendStatus(200);
});
 
 // Se você tem uma rota específica para exibir uma página de erro genérica
 app.use('/error', errorRoutes);
 
 
 // --- Error Handling ---
 // Manipulador para erros 404 (Página Não Encontrada) - Deve ser o último manipulador de rota regular
 app.use((req, res, next) => {
     res.status(404).render('error', { error: 'Página não encontrada.' });
 });
 
 // Manipulador de Erro Global - Deve ser o último middleware
 app.use((err, req, res, next) => {
     console.error('Erro Global Capturado:', err.stack);
     // Evite vazar detalhes do erro em produção
     const errorMessage = process.env.NODE_ENV === 'production' ?
         'Ocorreu um erro interno no servidor.' :
         err.message || 'Ocorreu um erro interno no servidor.';
     res.status(err.status || 500).render('error', { error: errorMessage });
 });
 
 // --- Start Server Function ---
 async function startServer() {
     try {
         await initializeDatabase(); // 1. Garante que o BD exista e o pool esteja pronto
         console.log("Conexão com o banco de dados PostgreSQL inicializada.");
 
         await initializeDatabaseTables(); // 2. Garante que as tabelas existam
         console.log("Tabelas do banco de dados verificadas/inicializadas.");
 
         app.listen(PORT, '0.0.0.0', () => {
             console.log(`Aplicação ATIVA em http://0.0.0.0:${PORT}`);
         });
 
     } catch (error) {
         console.error("FATAL: Falha ao inicializar a aplicação:", error);
         process.exit(1); // Encerra o processo se a inicialização crítica falhar
     }
 }
 
 // Inicia o servidor
 startServer();
 