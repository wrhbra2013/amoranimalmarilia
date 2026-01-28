// routes/authRoutes.js
const express = require('express');
const { pool } = require('../database/database'); // Import the pool
const router = express.Router();

// GET /login - Renderiza o formulário de login
router.get('/login', (req, res) => {
    // Se o usuário já estiver logado (verificando req.session.user), redireciona para /home
    if (req.session.user) {
        return res.redirect('/home');
    }
    // Passa mensagens de erro ou sucesso (ex: após logout) via query params
    res.render('login', {
        error: req.query.error || null,
        message: req.query.message || null
    });
});

router.get('/logout', (req, res) => {
    // Remove o usuário da sessão em vez de destruir a sessão inteira
    // Isso permite que o flash message persista para o redirecionamento
    req.session.user = null;
    req.flash('success', 'Usuário deslogado com sucesso.');
    res.redirect('/home');
});

// POST /login - Processa a tentativa de login
router.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
        return res.render('login', { error: 'Usuário e senha são obrigatórios.' });
    }

    try {
        // ATENÇÃO: Comparar senhas em texto plano é inseguro.
        // Considere usar hashing (ex: bcrypt) para senhas.
        const sql = `SELECT id, usuario, isadmin FROM login WHERE usuario = $1 AND senha = $2 LIMIT 1;`;

        const users = await pool.query(sql, [usuario, senha]);

        const foundUser = users.rows[0]; // Pega o primeiro usuário do array (ou undefined se o array estiver vazio)

        if (!foundUser) {
            // Usuário não encontrado ou senha incorreta
            return res.render('login', { error: 'Usuário ou senha inválidos.' });
        }

        // Verifica se os campos essenciais estão presentes no objeto retornado
        // (Embora a query deva garantir isso se um usuário for encontrado)
        if (typeof foundUser.id === 'undefined' ||
            typeof foundUser.usuario === 'undefined' ||
            typeof foundUser.isadmin === 'undefined') {
            console.error('Erro de login: Formato de dados do usuário inesperado.', foundUser);
            return res.status(500).render('login', { error: 'Erro interno ao processar dados do usuário.' });
        }

        console.log('Login bem-sucedido para o usuário:', foundUser.usuario);

        // Armazena as informações do usuário na sessão.
        // É uma boa prática garantir que `isAdmin` seja um booleano.
        req.session.user = {
            id: foundUser.id,
            usuario: foundUser.usuario,
            isAdmin: Boolean(foundUser.isadmin) // Converte 0/1 do SQLite para true/false
        };
        console.log('LOGIN - req.session.user definido:', JSON.stringify(req.session.user)); // LOG ADICIONAD0
        
        // Verifica solicitações de acesso pendentes (apenas para admins)
        if (req.session.user.isAdmin) {
            const pendingResult = await pool.query("SELECT COUNT(*) as count FROM solicitacao_acesso WHERE status = 'PENDENTE'");
            const pendingCount = parseInt(pendingResult.rows[0].count, 10);
            if (pendingCount > 0) {
                req.flash('warning', `Atenção: Existem ${pendingCount} solicitações de acesso a documentos pendentes.`);
            }
        }

        // Redireciona para a página inicial após o login bem-sucedido
        req.flash('success', 'Login bem-sucedido!')
        return res.redirect('/home');

    } catch (error) {

        console.error("Erro no processo de login:", error);
        // Para o usuário, uma mensagem genérica é geralmente melhor em caso de erro de servidor.
        return res.status(500).render('login', { error: 'Ocorreu um erro durante o login. Tente novamente mais tarde.' });
    }
});

module.exports = router;
