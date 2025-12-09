// Importa o Express
const express = require('express');
// Cria uma instância do Router
const router = express.Router();
const {executeQuery} = require('../database/queries')


// GET /eventos/novo - Rota para exibir o formulário de criação (protegida por admin)
router.get('/',async (req, res) => {
        try {
                const query = "SELECT * FROM voluntario";
                let voluntarioData = await executeQuery(query);
                
                // Garante que voluntarioData seja sempre um array, mesmo que executeQuery retorne null/undefined
                 if (!Array.isArray(voluntarioData)) {
                    voluntarioData = [];
                }

                res.render('sobre', {
                        model: voluntarioData,
                        success_msg: req.flash('success_msg'),
                        error_msg: req.flash('error_msg')
                });
        } catch (error) {
                console.error("Error fetching volunteer data for /sobre:", error);
                req.flash('error_msg', 'Não foi possível carregar a lista de voluntários.');
                // Renderiza a página 'sobre' mesmo em caso de erro, mas com um array vazio para 'model'
                res.status(500).render('sobre', { model: [], error_msg: req.flash('error_msg') });
        }

       // res.render('sobre'); // Renderiza o formulário
});


module.exports = router;