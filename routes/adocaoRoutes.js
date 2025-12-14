 // routes/adocaoRoutes.js
 const express = require('express');
 const { executeQuery } = require('../database/queries'); // Importa executeQuery
 const { insert_adocao } = require('../database/insert'); // Importa insert_adocao
 const fs = require('fs').promises; // Use promises API for fs
 const path = require('path');
 const { isAdmin } = require('../middleware/auth');
 const { uploadAdocao } = require('../utils/multerConfig'); // Specific multer instance
 

 const router = express.Router();
 

 // GET route to display adoption listings
 router.get('/', async (req, res) => {
     try {
         const query = "SELECT * FROM adocao";
         const adocaoData = await executeQuery(query);
         res.render('adote', {
             model: adocaoData,
             success_msg: req.flash('success_msg'),
             error_msg: req.flash('error_msg')
         });
     } catch (error) {
         console.error("Error fetching adoption data:", error);
         req.flash('error_msg', 'Não foi possível carregar os dados de adoção.');
         res.status(500).render('error', { error: 'Não foi possível carregar os dados de adoção.' });
     }
 });
 

 // GET route to render the adoption form
 router.get('/form', (req, res) => {
     res.render('form_adocao', {
         error: req.flash('error'), // Para erros de validação do formulário
         success_msg: req.flash('success_msg'),
         error_msg: req.flash('error_msg'),
         // Passar dados do formulário anterior em caso de erro, se necessário
         formData: req.flash('formData')[0] || {}
     });
 });
 

 //Rota generica para edição (ou visualização detalhada)
 router.get('/:id', async (req, res) => {
     const id = req.params.id;
     const tabela = 'adocao';
     try {
         const query = "SELECT * FROM adocao WHERE id = $1 LIMIT 1";
         const params = [id];
         const [item] = await executeQuery(query, params); // Desestrutura o primeiro elemento do array
         if (!item) {
             req.flash('error_msg', 'Item de adoção não encontrado.');
             return res.redirect('/adocao');
         }
         res.render('edit', {
             model: item,
             tabela: tabela,
             id: id,
             success_msg: req.flash('success_msg'),
             error_msg: req.flash('error_msg')
         });
     } catch (error) {
         console.error("Error fetching adoption detail:", error);
         req.flash('error_msg', 'Não foi possível carregar os detalhes do pet para adoção.');
         res.status(500).render('error', { error: 'Não foi possível carregar os detalhes do pet para adoção.' });
     }
 });
 

 // POST route to handle form submission for new adoption entries
 router.post('/form', uploadAdocao.single('arquivo'), async (req, res) => {
     if (!req.file) {
         req.flash('error', 'Nenhum arquivo foi enviado.');
         req.flash('formData', req.body); // Salva os dados do formulário para repreencher
         return res.redirect('/adocao/form');
     }
 

     const { destination, filename: tempFilename, originalname } = req.file;
 

     let finalFilename;
     try {
         // Tenta criar um nome de arquivo único baseado na contagem de arquivos ou timestamp
         const filesInDir = await fs.readdir(destination).catch(() => []); // Evita erro se diretório não existir ainda
         const count = filesInDir.length;
         finalFilename = `${Date.now()}_${count}${path.extname(originalname)}`;
     } catch (readDirError) {
         console.error("Error reading directory for file count:", readDirError);
         // Fallback para um nome baseado em timestamp se a contagem falhar
         finalFilename = `${Date.now()}${path.extname(originalname)}`;
     }
 

     const tempFilePath = path.join(destination, tempFilename);
     const finalFilePath = path.join(destination, finalFilename);
 

     try {
         await fs.rename(tempFilePath, finalFilePath);
         console.log(`Arquivo movido para: ${finalFilePath}`);
 
         const anos = req.body.idadePetAnos;
         const meses = req.body.idadePetMeses;
         let idadeString = '';
         if (anos && parseInt(anos, 10) > 0) {
             idadeString += `${anos} ${parseInt(anos, 10) > 1 ? 'anos' : 'ano'}`;
         }
         if (meses && parseInt(meses, 10) > 0) {
             if (idadeString) {
                 idadeString += ' e ';
             }
             idadeString += `${meses} ${parseInt(meses, 10) > 1 ? 'meses' : 'mês'}`;
         }

         const adocaoData = {
             arquivo: finalFilename,
             nome: req.body.nomePet, // O campo foi removido do form, então será undefined
             idade: idadeString,
             especie: req.body.especie,
             porte: req.body.porte,
             caracteristicas: req.body.caracteristicas,
             tutor: req.body.tutor,
             contato: req.body.contato,
             whatsapp: req.body.whatsapp
         };
 

         await insert_adocao(
             adocaoData.arquivo,
             adocaoData.nome,
             adocaoData.idade,
             adocaoData.especie,
             adocaoData.porte,
             adocaoData.caracteristicas,
             adocaoData.tutor,
             adocaoData.contato,
             adocaoData.whatsapp
         );
         
         req.flash('success', 'Dados de adoção inseridos com sucesso.');
         res.redirect('/home'); // Ou para /adocao para ver a lista atualizada
 

     } catch (error) {
         console.error("Erro ao processar formulário de adoção:", error);
         // Tenta limpar o arquivo enviado em caso de erro no banco de dados
         try {
             if (await fs.stat(tempFilePath).catch(() => false)) {
                 await fs.unlink(tempFilePath);
                 console.log("Arquivo temporário removido após erro:", tempFilePath);
             } else if (await fs.stat(finalFilePath).catch(() => false)) { // Se já foi movido
                 await fs.unlink(finalFilePath);
                 console.log("Arquivo final (movido) removido após erro:", finalFilePath);
             }
         } catch (cleanupError) {
             console.error("Erro ao limpar arquivo após falha no formulário de adoção:", cleanupError);
         }
         req.flash('error', 'Erro ao salvar os dados de adoção. Tente novamente.');
         req.flash('formData', req.body); // Salva os dados do formulário para repreencher
         res.redirect('/adocao/form');
     }
 });
 

 // POST route to delete an adoption entry
 router.post('/delete/adocao/:id/:arq', isAdmin, async (req, res) => {
     const { id, arq } = req.params;
     const uploadsDir = path.join(__dirname, '..', 'static', 'uploads', 'adocao');
     // É importante sanitizar 'arq' para evitar Path Traversal.
     // path.basename garante que estamos apenas pegando o nome do arquivo.
     const filePath = path.join(uploadsDir, path.basename(arq));
 

     try {
         const deleteSql = `DELETE FROM adocao WHERE id = $1`;
         const params = [id];
         const result = await executeQuery(deleteSql, params);
 

         // Em SQLite, executeQuery para DELETE não retorna affectedRows diretamente como no MySQL com node-mysql2.
         // Você precisaria adaptar executeQuery ou verificar de outra forma se a deleção ocorreu.
         // Por simplicidade, vamos assumir que se não houver erro, a operação foi tentada.
         // Para SQLite, `this.changes` dentro do callback de `db.run` daria o número de linhas afetadas.
         // Se executeQuery for adaptado para retornar `this.changes` para SQLite, você pode usar:
         // if (result.changes === 0) {
         //    req.flash('error_msg', 'Nenhum item de adoção encontrado com este ID para deletar.');
         // } else {
         //    req.flash('success_msg', 'Item de adoção deletado com sucesso.');
         // }
 

         // Tentativa de deletar o arquivo associado
         try {
             await fs.access(filePath); // Verifica se o arquivo existe
             await fs.unlink(filePath);
             console.log(`Arquivo ${filePath} deletado com sucesso.`);
         } catch (fileError) {
             if (fileError.code !== 'ENOENT') { // ENOENT = Error NO ENTry (arquivo não encontrado)
                 console.error(`Erro ao deletar o arquivo ${filePath} (não é ENOENT):`, fileError);
                 // Considerar se deve ou não enviar um flash de erro para o usuário sobre o arquivo
             } else {
                 console.log(`Arquivo ${filePath} não encontrado para deleção (ENOENT), pode já ter sido removido.`);
             }
         }
         req.flash('success', 'Removido com sucesso.'); // Mensagem mais genérica
         res.redirect('/adocao');
 

     } catch (error) {
         console.error(`Erro ao deletar registro de adoção com ID: ${id}:`, error);
         req.flash('error_msg', 'Erro ao deletar o item de adoção. Tente novamente.');
         res.redirect('/adocao'); // Redireciona de volta para a lista com a mensagem de erro
     }
 });
 

 module.exports = router;
