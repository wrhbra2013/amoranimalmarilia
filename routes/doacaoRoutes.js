// Importa o Express
const express = require('express');
const { insert_voluntario, insert_coleta } = require('../database/insert');
const { isAdmin } = require('../middleware/auth');
const {executeAllQueries} = require('../database/queries');




// Cria uma instância do Router
const router = express.Router();


// GET /eventos/novo - Rota para exibir o formulário de criação (protegida por admin)
router.get('/', (req, res) => {
        res.render('doacao'); // Renderiza o formulário
});

router.get('/form', (req, res) => {
        res.render('form_doe');

});

router.get('/coleta',  isAdmin, async (req, res) => {             
         
                const results = await executeAllQueries();
                const coleta = results.coleta;       
                res.render('coleta', { model: coleta }); 
         
        });

router.get('/voluntario',  isAdmin, async (req, res) => {               
       
                const results =  await executeAllQueries();
                const voluntario = results.voluntario;       
                res.render('voluntario', { model: voluntario }); 
            
        });


router.get('/voluntario/form', (req, res) => {
        res.render('form_voluntario');

});

router.post('/voluntario/form', async (req, res) => { // Tornando a função assíncrona
    const form = {
        nome: req.body.nome,
        localidade: req.body.localidade,
        telefone: req.body.telefone,
        whatsapp: req.body.whatsapp,
        disponibilidade: req.body.disponibilidade,
        habilidade: req.body.habilidade,
        mensagem: req.body.mensagem
    };
    try {
        await insert_voluntario( // Aguardando a conclusão da inserção
            form.nome,
            form.localidade,
            form.telefone,
            form.whatsapp,
            form.disponibilidade,
            form.habilidade,
            form.mensagem
        );
        req.flash('success_msg', 'Voluntário cadastrado com sucesso!'); // Usando success_msg para consistência
        res.redirect('/home');
    } catch (error) {
        console.error("Erro ao cadastrar voluntário:", error);
        req.flash('error_msg', 'Falha ao cadastrar voluntário. Tente novamente.');
        res.redirect('/doacao/voluntario/form'); // Redireciona de volta para o formulário
    }
});

router.get('/coleta/form', (req, res) => {
        res.render('form_coleta');
});



router.post('/coleta/form', (req, res) => {
        const form ={
                nome: req.body.nome,
                telefone: req.body.telefone,
                whatsapp: req.body.whatsapp,
                item: req.body.item,
                quantidade: req.body.quantidade,
                data: req.body.data,
                hora: req.body.hora,
                cep: req.body.cep,
                endereco: req.body.endereco,
                numero: req.body.numero,
                complemento: req.body.complemento,
                bairro: req.body.bairro,
                cidade: req.body.cidade,
                estado: req.body.estado,
                mensagem: req.body.mensagem
        }
        insert_coleta(
                form.nome,
                form.telefone,
                form.whatsapp,
                form.item,
                form.quantidade,
                form.data,
                form.hora,    
                form.cep,
                form.endereco,
                form.numero,
                form.complemento,
                form.bairro,
                form.cidade,
                form.estado,
                form.mensagem
        );
        req.flash('success', 'Coleta agendada com sucesso!')
        res.redirect('/home');        
 })


module.exports = router;