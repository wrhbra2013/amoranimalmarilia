// Importa o Express
const express = require('express');
// Cria uma instância do Router
const router = express.Router();
const {executeQuery} = require('../database/queries')


// GET /eventos/novo - Rota para exibir o formulário de criação (protegida por admin)
router.get('/', async (req, res) => {
    try {
        const query = "SELECT * FROM voluntario";
        const voluntarioData = await executeQuery(query);

        res.render('sobre', {
            model: voluntarioData || [], // Garante que 'model' seja sempre um array
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (error) {
        console.error("Erro ao buscar dados de voluntários para a página Sobre:", error);
        req.flash('error_msg', 'Não foi possível carregar a lista de voluntários.');
        res.status(500).render('sobre', { model: [], error_msg: req.flash('error_msg') });
    }
});


module.exports = router;