  // /home/wander/amor.animal2/routes/castracaoRoutes.js
  const express = require('express');
  const { executeAllQueries, executeQuery } = require('../database/queries');
  const { insert_castracao } = require('../database/insert');
  const fs = require('fs').promises;
  const path = require('path');
  const { isAdmin } = require('../middleware/auth');
  const { uploadCastracao } = require('../utils/multerConfig');
  const { pool } = require('../database/database');
  
  const router = express.Router();
  
  // GET /castracao - Exibe os registros de castração
  router.get('/', async (req, res) => {
      try {
          const results = await executeAllQueries();
          const castracaoData = results.castracao; // Extrai os dados específicos de castração
  
          
  
          res.render('castracao', { model: castracaoData });
      } catch (error) {
          console.error("[castracaoRoutes GET /] Erro ao buscar dados de castração:", error.message);
          res.status(500).render('error', { error: error.message || 'Não foi possível carregar os dados de castração.' });
      }
  });
  
  // GET /castracao/form - Renderiza o formulário para novo registro de castração
  router.get('/form', async (req, res) => {
      try {
          // Busca a lista de clínicas do banco de dados para popular o dropdown no formulário.
          const clinicas = await executeQuery("SELECT nome FROM clinicas ORDER BY nome;");
          const formData = req.flash('formData')[0] || {};

          // Se uma nova clínica foi recém-criada, seu nome virá na query string.
          // Vamos pré-selecioná-la no formulário.
          if (req.query.new_clinic_name) {
              formData.clinica = req.query.new_clinic_name;
          }
          
          res.render('form_castracao', { 
              clinicas: clinicas, 
              error: req.flash('error'),
              formData: formData
          });
      } catch (error) {
          console.error("[castracaoRoutes GET /form] Erro ao buscar clínicas:", error.message);
          // Em caso de erro no banco, renderiza a página com uma mensagem de erro e uma lista vazia
          res.status(500).render('form_castracao', { 
              error: 'Não foi possível carregar a lista de clínicas. Tente novamente mais tarde.',
              clinicas: [] 
          });
      }
  });
  
  // POST /castracao/form - Processa o formulário de novo registro de castração
  router.post('/form', uploadCastracao.single('arquivo'), async (req, res) => {
      if (!req.file) {
          req.flash('error', 'Nenhum arquivo foi enviado.');
          req.flash('formData', req.body);
          return res.redirect('/castracao/form');
      }
  
      // O arquivo já foi salvo com um nome único pelo multer. Não é necessário renomear.
      const { filename } = req.file;
      const finalFilePath = req.file.path;
  
      try {
          console.log(`[castracaoRoutes POST /form] Arquivo de castração salvo como: ${filename}`);
  
          const clinicaFinal = req.body.clinica;

          // Gera um ticket. A coluna 'ticket' na tabela 'castracao' é UNIQUE.
          const ticket = req.body.ticket || Math.floor(Math.random() * 10000);

          const castracaoData = {
              ticket: ticket,
              nome: req.body.nome,
              contato: req.body.contato,
              whatsapp: req.body.whatsapp,
              arquivo: filename, // Salva o nome de arquivo único gerado pelo multer
              idade: req.body.idade_pet,
              especie: req.body.especie,
              porte: req.body.porte,
              clinica: clinicaFinal, // Usa a clínica selecionada ou a nova
              agenda: req.body.agenda,
          };
  
          await insert_castracao(
              castracaoData.ticket,
              castracaoData.nome,
              castracaoData.contato,
              castracaoData.whatsapp,
              castracaoData.arquivo,
              castracaoData.idade,
              castracaoData.especie,
              castracaoData.porte,
              castracaoData.clinica, // Usa a clínica selecionada ou a nova
              castracaoData.agenda
          );
          console.log('[castracaoRoutes POST /form] Dados de castração inseridos:', castracaoData);
          req.flash('success', 'Agendamento de castração solicitado com sucesso.');
          res.redirect('/home');
  
      } catch (error) {
          console.error("[castracaoRoutes POST /form] Erro ao processar formulário de castração:", error);
          // Tenta limpar o arquivo que foi salvo pelo multer em caso de erro no banco de dados.
          try {
              await fs.unlink(finalFilePath);
              console.log("[castracaoRoutes POST /form] Arquivo salvo removido após erro no banco de dados:", finalFilePath);
          } catch (cleanupError) {
              console.error("[castracaoRoutes POST /form] Erro ao limpar arquivo após falha no formulário:", cleanupError);
          }
  
          let errorMessage = 'Erro ao salvar os dados de castração. Tente novamente.';
          // Verifica se o erro é de violação de constraint UNIQUE (código para PostgreSQL)
          if (error.code === '23505') {
              errorMessage = 'Erro: O número do ticket já existe. Tente enviar o formulário novamente.';
          }
          req.flash('error', errorMessage);
          req.flash('formData', req.body);
          res.redirect('/castracao/form');
      }
  });
  
  // POST /castracao/delete/:id/:arq - Deleta um registro de castração
  router.post('/delete/:id/:arq', isAdmin, async (req, res) => {
      const { id, arq } = req.params;
      const uploadsDir = path.join(__dirname, '..', 'static', 'uploads', 'castracao');
      const filePath = path.join(uploadsDir, path.basename(arq)); // path.basename para segurança
  
      try {
          const deleteSql = `DELETE FROM castracao WHERE id = $1`;
          const result = await pool.query(deleteSql, [id]);
  
          if (result.rowCount === 0) {
              console.warn(`[castracaoRoutes DELETE] Nenhum registro encontrado na tabela 'castracao' com ID: ${id} para deletar.`);
          } else {
              console.log(`[castracaoRoutes DELETE] Registro de castração com ID: ${id} deletado.`);
          }
  
          // Tenta deletar o arquivo associado
          try {
              await fs.unlink(filePath);
              console.log(`[castracaoRoutes DELETE] Arquivo de castração ${filePath} deletado.`);
          } catch (fileError) {
              if (fileError.code === 'ENOENT') {
                  console.log(`[castracaoRoutes DELETE] Arquivo ${filePath} não encontrado para deleção, pode já ter sido removido.`);
              } else {
                  console.error(`[castracaoRoutes DELETE] Erro ao deletar arquivo de castração ${filePath} (não é ENOENT):`, fileError);
              }
          }
          req.flash('success', 'Registro de castração removido com sucesso.');
          res.redirect('/castracao');
  
      } catch (error) {
          console.error(`[castracaoRoutes DELETE /delete/:id/:arq] Erro ao deletar registro de castração com ID: ${id}:`, error);
          res.status(500).render('error', { error: 'Erro ao deletar o agendamento de castração. Tente novamente.' });
      }
  });

  //Rota generica
   router.get('/:id', async (req, res) => {
   const id = req.params.id;
   const tabela = 'castracao';
   try {
        const query = "SELECT * FROM castracao WHERE id = $1 LIMIT 1";
        const [item] = await executeQuery(query, [id]);

        if (!item) {
            req.flash('error', 'Registro de castração não encontrado.');
            return res.redirect('/castracao');
        }

        res.render('edit', { model: item, tabela: tabela, id: id });
   } catch (error) {
        console.error(`[castracaoRoutes GET /:id] Error fetching castracao detail for id ${id}:`, error);
        res.status(500).render('error', { error: 'Não foi possível carregar os detalhes do registro de castração.' });
   }
   })
  
  module.exports = router;
 