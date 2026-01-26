  // /home/wander/amor.animal2/routes/homeRoutes.js
  const express = require('express');
  const { pool } = require('../database/database'); // Usa o pool de conexões do PostgreSQL
  const { executeAllQueries, executeQuery } = require('../database/queries'); // Essencial para buscar dados para a home
  const { insert_home, insert_campanha_foto } = require('../database/insert');     // Para o formulário de notícias da home
  const fs = require('fs').promises;
  const path = require('path');
  const { isAdmin } = require('../middleware/auth');
  const { uploadHome, uploadCampanha } = require('../utils/multerConfig');   // Multer para upload de notícias da home
  
  const router = express.Router();
  
  // Middleware para verificar consentimento de cookies
  function checkCookieConsent(req, res, next) {
      const cookieAccepted = req.cookies && req.cookies.cookie_consent === 'accepted';

      if (cookieAccepted) {
          res.locals.showCookieBanner = false;
      } else {
          res.locals.showCookieBanner = true;
      }
      next();
  }
  
  // Função para buscar dados da página inicial
 // /home/wander/amor.animal2/routes/homeRoutes.js
 
 // ... outras importações ...
 
 async function getHomePageData() {
     try {
         const rawData = await executeAllQueries(); // Retorna o objeto 'results' de executeAllQueries
         const data = rawData || {};
 
         // Função auxiliar para extrair a contagem de forma segura
         const extractCountValue = (countResult) => {
             // countResult é o que vem de data.XCount (ex: data.voluntarioCount)
             // Esperado: [{ count: 'N' }] ou { error: '...' } em caso de falha na query
             // O driver 'pg' retorna o resultado de COUNT(*) como uma string.
             if (countResult && Array.isArray(countResult) && countResult.length > 0 && countResult[0].count !== undefined) {
                 // Converte a contagem (que é uma string) para um número inteiro.
                 return parseInt(countResult[0].count, 10);
             }
             // Loga se a query de contagem falhou
             if (countResult && countResult.error) {
                 console.warn(`Falha ao obter contagem (query result): ${JSON.stringify(countResult)}`);
             }
             return 0; // Valor padrão em caso de falha ou dados inesperados
         };
 
         return {
             home: data.home || [],
             adocao: data.adocao || [],
             adocaoCount: extractCountValue(data.adocaoCount),
             adotante: data.adotante || [],
             adotanteCount: extractCountValue(data.adotanteCount),
             adotado: data.adotado || [],
             adotadoCount: extractCountValue(data.adotadoCount),
             castracao: data.castracao || [],
             castracaoCount: extractCountValue(data.castracaoCount),
             procura_se: data.procura_se || [],
             procura_seCount: extractCountValue(data.procura_seCount),
             parceria: data.parceria || [],
             parceriaCount: extractCountValue(data.parceriaCount),
             voluntario: data.voluntario || [],
             voluntarioCount: extractCountValue(data.voluntarioCount),
             coleta: data.coleta || [],
             coletaCount: extractCountValue(data.coletaCount),
             errorLoadingData: false // Agora será um número
         };
     } catch (error) {
         // Este catch é para erros na chamada executeAllQueries em si.
         console.error("Erro crítico em getHomePageData ao chamar executeAllQueries:", error);
         // Retornar um objeto com todas as contagens como 0 e arrays vazios para dados
         // para evitar que a página quebre completamente.
         return {
             home: [], adocao: [], adocaoCount: 0,
             adotante: [], adotanteCount: 0, adotado: [], adotadoCount: 0,
             castracao: [], castracaoCount: 0, procura_se: [], procura_seCount: 0,
             parceria: [], parceriaCount: 0, voluntario: [], voluntarioCount: 0,   coleta: [], coletaCount: 0,
             errorLoadingData: true // Flag para o template, se necessário
         };
     }
 }
 
 // Rota principal para '/' e '/home' (Dashboard Completo)
 router.get(['/', '/home'], checkCookieConsent, async (req, res) => {
     try {
         const homePageData = await getHomePageData();
         
         // Se houve um erro carregando os dados, você pode querer logar ou mostrar uma mensagem específica
         if (homePageData.errorLoadingData) {
             req.flash('error', 'Ocorreu um erro ao carregar alguns dados da página. Tente novamente mais tarde.');
         }
 
         res.render('home', {
             user: req.user,
             isAdmin: req.isAdmin || false,
             model1: homePageData.home,
             model2: homePageData.adocao,
             model3: homePageData.adocaoCount, // Será um número
             model4: homePageData.adotante,
             model5: homePageData.adotanteCount, // Será um número
             model6: homePageData.adotado,
             model7: homePageData.adotadoCount, // Será um número
             model8: homePageData.castracao,
             model9: homePageData.castracaoCount, // Será um número
             model10: homePageData.procura_se,
             model11: homePageData.procura_seCount, // Será um número
             model12: homePageData.parceria,
             model13: homePageData.parceriaCount, // Será um número
             model14: homePageData.voluntario,
             model15: homePageData.voluntarioCount, 
             model16: homePageData.coleta,
             model17: homePageData.coletaCount,
             success_msg: req.flash('success'),
             error_msg: req.flash('error') // Adicionando para consistência
         });
     } catch (error) {
         // Este catch é mais para erros inesperados no próprio handler da rota.
         console.error("homeRoutes GET /home: Erro ao carregar a página inicial:", error.message);
         req.flash('error', 'Não foi possível carregar a página inicial.');
         res.status(500).render('error', { error: error.message || 'Não foi possível carregar a página inicial.' });
     }
 });
 
//           res.status(500).render('error', { error: error.message || 'Não foi possível carregar a página inicial.' });
//       }
//   });
  
  // Rota para renderizar o formulário de "Notícias" da home
  // Esta rota deve vir ANTES da rota /campanha/:id
  router.get(['/campanha/form', '/home/form'], isAdmin, (req, res) => {
      res.render('form_home'); // Assumes form_home.ejs exists
  });

  // Rota para exibir uma campanha específica (Detalhes / Página Filho)
  router.get('/campanha/:id', async (req, res) => {
      const { id } = req.params;
  
      try {
          const query = 'SELECT * FROM home WHERE id = $1';
          const newsItems = await executeQuery(query, [id]);
          
          // Busca fotos adicionais da campanha
          const fotos = await executeQuery('SELECT * FROM campanha_fotos WHERE campanha_id = $1 ORDER BY id DESC', [id]);
  
          if (newsItems && newsItems.length > 0) {
              res.render('view_campanha', {
                  item: newsItems[0],
                  fotos: fotos,
                  user: req.user,
                  isAdmin: req.isAdmin || false
              });
          } else {
              req.flash('error_msg', 'Notícia não encontrada.');
              res.status(404).redirect('/');
          }
      } catch (error) {
          console.error(`homeRoutes GET /campanha/${id}: Erro ao buscar campanha:`, error);
          req.flash('error_msg', 'Erro ao carregar a notícia.');
          res.status(500).redirect('/');
      }
  });
  
  // Rota para processar o formulário de "Notícias" da home
  router.post(['/campanha/form', '/home/form'], isAdmin, uploadHome.single('arquivo'), async (req, res) => {
      if (!req.file) {
          return res.status(400).render('form_home', { error: 'Nenhum arquivo foi enviado.' });
      }
  
      // O nome do arquivo já é único, gerado pelo multerConfig.
      const { filename, destination } = req.file;
      const finalFilePath = path.join(destination, filename);
  
      try {
          // CORREÇÃO: Não é mais necessário renomear o arquivo. O multer já o salvou
          // com um nome único e seguro no caminho correto.
          console.log(`homeRoutes: Arquivo de notícia salvo como: ${filename}`);
  
          const homeData = {
              // CORREÇÃO: Salva o nome de arquivo único no banco de dados.
              arquivo: filename,
              titulo: req.body.titulo,
              conteudo: req.body.conteudo,
              link: req.body.link
          };
  
          await insert_home(homeData.arquivo, homeData.titulo, homeData.conteudo, homeData.link);
          console.log('homeRoutes: Dados de notícia da home inseridos:', homeData);
          res.redirect('/'); // Redireciona para a lista de campanhas
  
      } catch (error) {
          console.error("homeRoutes POST /form: Erro ao processar formulário de notícia da home:", error);
          // Tenta limpar o arquivo que foi salvo pelo multer em caso de erro no banco de dados.
          try {
              // CORREÇÃO: Tenta remover o arquivo final diretamente.
              await fs.unlink(finalFilePath);
              console.log("homeRoutes: Arquivo salvo removido após erro no banco de dados:", finalFilePath);
          } catch (cleanupError) {
              console.error("homeRoutes: Erro ao limpar arquivo após falha no formulário de notícia:", cleanupError);
          }
          res.status(500).render('form_home', { error: 'Erro ao salvar os dados da notícia. Tente novamente.' });
      }
  });
  
  // Rota para upload de fotos adicionais na página da campanha (Cria subpasta nome_data)
  router.post('/campanha/:id/foto', isAdmin, uploadCampanha.single('foto'), async (req, res) => {
      const { id } = req.params;
      
      if (!req.file) {
          req.flash('error_msg', 'Nenhuma foto selecionada.');
          return res.redirect(`/campanha/${id}`);
      }

      try {
          // 1. Buscar informações da campanha para criar o nome da pasta
          const [campanha] = await executeQuery('SELECT titulo, origem FROM home WHERE id = $1', [id]);
          
          if (!campanha) {
              await fs.unlink(req.file.path); // Remove o arquivo temporário
              req.flash('error_msg', 'Campanha não encontrada.');
              return res.redirect('/');
          }

          // 2. Criar nome da subpasta: nome_campanha_data
          const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const dataStr = new Date(campanha.origem).toISOString().split('T')[0];
          const folderName = `${sanitize(campanha.titulo)}_${dataStr}`;
          
          // Caminho base de uploads de campanha (definido no multerConfig como ../../amoranimal_uploads/campanha)
          const baseUploadDir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'campanha');
          const targetDir = path.join(baseUploadDir, folderName);

          // 3. Criar a subpasta se não existir
          await fs.mkdir(targetDir, { recursive: true });

          // 4. Mover o arquivo da raiz de /campanha/ para a subpasta
          const oldPath = req.file.path;
          const newFilename = req.file.filename;
          const newPath = path.join(targetDir, newFilename);
          
          await fs.rename(oldPath, newPath);

          // 5. Salvar no banco (caminho relativo para acesso via URL /uploads/campanha/...)
          const dbPath = `${folderName}/${newFilename}`;
          await insert_campanha_foto(id, dbPath);

          req.flash('success_msg', 'Foto adicionada com sucesso!');
          res.redirect(`/campanha/${id}`);

      } catch (error) {
          console.error("homeRoutes POST /campanha/:id/foto: Erro:", error);
          req.flash('error_msg', 'Erro ao salvar a foto.');
          res.redirect(`/campanha/${id}`);
      }
  });

  // Rota para deletar foto adicional da campanha
  router.post('/campanha/foto/delete/:id', isAdmin, async (req, res) => {
      const { id } = req.params;
      try {
          const [foto] = await executeQuery('SELECT * FROM campanha_fotos WHERE id = $1', [id]);
          if (foto) {
              await executeQuery('DELETE FROM campanha_fotos WHERE id = $1', [id]);
              
              const filePath = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'campanha', foto.arquivo);
              await fs.unlink(filePath).catch(err => console.error("Erro ao deletar arquivo físico:", err.message));
              
              req.flash('success_msg', 'Foto removida.');
              res.redirect(`/campanha/${foto.campanha_id}`);
          } else {
              res.redirect('/');
          }
      } catch (error) {
          console.error("Erro ao deletar foto:", error);
          res.redirect('/');
      }
  });

  // Rota para deletar "Notícias" da home
  router.post('/delete/campanha/:id/:arq', isAdmin, async (req, res) => {
      const { id, arq } = req.params;
     
      const uploadsDir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'home');
      const filePath = path.join(uploadsDir, path.basename(arq)); // path.basename for security
  
      try {
          const deleteSql = `DELETE FROM home WHERE id = $1`;
          const result = await pool.query(deleteSql, [id]);
  
          if (result.rowCount === 0) {
              console.warn(`homeRoutes: Nenhum registro encontrado na tabela 'home' com ID: ${id} para deletar.`);
          } else {
              console.log(`homeRoutes: Registro de notícia da home com ID: ${id} deletado.`);
          }
  
          try {
              await fs.access(filePath); 
              await fs.unlink(filePath);
              console.log(`homeRoutes: Arquivo de notícia ${filePath} deletado.`);
          } catch (fileError) {
              if (fileError.code === 'ENOENT') { 
                  console.log(`homeRoutes: Arquivo ${filePath} não encontrado para deleção, pode já ter sido removido.`);
              } else {
                  console.error(`homeRoutes: Erro ao deletar arquivo de notícia ${filePath} (não é ENOENT):`, fileError);
              }
          }
          res.redirect('/');
      } catch (error) {
          console.error(`homeRoutes DELETE /delete/home: Erro ao deletar notícia da home com ID: ${id}:`, error);
          res.status(500).render('error', { error: 'Erro ao deletar a notícia. Tente novamente.' });
      }
  });
  
  module.exports = router;
  
 