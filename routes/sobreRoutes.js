// Importa o Express
const express = require('express');
// Cria uma instância do Router
const router = express.Router();
const {executeQuery} = require('../database/queries')


// GET /eventos/novo - Rota para exibir o formulário de criação (protegida por admin)
router.get('/',async (req, res) => {
        try {
                const query = "SELECT * FROM voluntario";
                const voluntarioData = await executeQuery(query);
                res.render('sobre', {
                        model: voluntarioData,
                        success_msg: req.flash('success_msg'),
                        error_msg: req.flash('error_msg')
                });
        } catch (error) {
                console.error("Error fetching adoption data:", error);
                req.flash('error_msg', 'Não foi possível carregar os dados de adoção.');
                res.status(500).render('error', { error: 'Não foi possível carregar os dados de adoção.' });      }

       // res.render('sobre'); // Renderiza o formulário
});


module.exports = router;