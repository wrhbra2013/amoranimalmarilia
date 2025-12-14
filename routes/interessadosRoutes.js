const express = require('express');
const { executeQuery } = require('../database/queries');
const { insert_interessado_adocao } = require('../database/insert');
const { isAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /interessados - List all interested people (for admins)
router.get('/', isAdmin, async (req, res) => {
    try {
        const query = "SELECT * FROM interessados_adocao ORDER BY origem DESC";
        const interessados = await executeQuery(query);
        res.render('interessados', { 
            model: interessados,
            user: req.user,
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error("[interessadosRoutes GET /] Erro ao buscar dados:", error);
        req.flash('error_msg', 'Não foi possível carregar a lista de interessados.');
        res.status(500).redirect('/admin'); // Redirect to admin panel or home
    }
});

// GET /interessados/form - Show the form to register interest
router.get('/form', (req, res) => {
    res.render('form_interesse_adocao', {
        error_msg: req.flash('error_msg'),
        success_msg: req.flash('success_msg')
    });
});

// POST /interessados/form - Process the form
router.post('/form', async (req, res) => {
    try {
        const { nome, contato, whatsapp, especie, porte, caracteristicas } = req.body;
        
        if (!nome || !contato) {
            req.flash('error_msg', 'Nome e contato são campos obrigatórios.');
            return res.redirect('/interessados/form');
        }

        await insert_interessado_adocao(nome, contato, whatsapp, especie, porte, caracteristicas);
        
        req.flash('success_msg', 'Seu interesse foi registrado com sucesso! Entraremos em contato quando houver um pet com o perfil desejado.');
        res.redirect('/home');

    } catch (error) {
        console.error("[interessadosRoutes POST /form] Erro ao processar formulário:", error);
        req.flash('error_msg', 'Ocorreu um erro ao registrar seu interesse. Tente novamente.');
        res.redirect('/interessados/form');
    }
});

// POST /interessados/delete/:id - Delete a record
router.post('/delete/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const deleteSql = `DELETE FROM interessados_adocao WHERE id = $1`;
        const result = await executeQuery(deleteSql, [id]);

        if (result.rowCount > 0) {
            req.flash('success_msg', 'Registro de interesse removido com sucesso.');
        } else {
            req.flash('error_msg', 'Não foi possível encontrar o registro para remoção.');
        }
        res.redirect('/interessados');
    } catch (error) {
        console.error(`[interessadosRoutes DELETE /delete/:id] Erro ao remover registro:`, error);
        req.flash('error_msg', 'Ocorreu um erro ao remover o registro.');
        res.redirect('/interessados');
    }
});

module.exports = router;
