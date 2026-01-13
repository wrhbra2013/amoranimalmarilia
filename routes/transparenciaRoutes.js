const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database/queries');
const { uploadTransparencia } = require('../utils/multerConfig');
const fs = require('fs').promises;
const path = require('path');
const { isAdmin } = require('../middleware/auth');

// Mapeamento dos tipos de documentos para títulos legíveis
const typesMap = {
    'estatuto': 'Estatuto Social',
    'diretoria': 'Diretoria',
    'balanco': 'Balanços e Demonstrativos de Resultado',
    'financeiro': 'Relatório Financeiro',
    'atividades': 'Relatório de Atividades',
    'colaboracao': 'Termos de Colaboração',
    'plano': 'Plano de Trabalho'
};

// GET /transparencia - Dashboard com os botões
router.get('/', (req, res) => {
    res.render('transparencia_dashboard', { 
        types: typesMap,
        user: req.user,
        isAdmin: req.isAdmin || false
    });
});

// GET /transparencia/lista/:tipo - Lista documentos de um tipo específico
router.get('/lista/:tipo', async (req, res) => {
    const { tipo } = req.params;
    
    // Verifica se o tipo é válido
    if (!typesMap[tipo]) {
        req.flash('error', 'Categoria inválida.');
        return res.redirect('/transparencia');
    }

    try {
        // Busca documentos ordenados por ano (decrescente) e depois por ID
        const sql = 'SELECT * FROM transparencia WHERE tipo = $1 ORDER BY ano DESC, id DESC';
        const docs = await executeQuery(sql, [tipo]);

        res.render('transparencia_lista', { 
            tipo: tipo, 
            titulo: typesMap[tipo], 
            docs: docs,
            user: req.user,
            isAdmin: req.isAdmin || false
        });
    } catch (error) {
        console.error(`[transparenciaRoutes] Erro ao buscar lista ${tipo}:`, error);
        res.status(500).render('error', { error: 'Erro ao carregar documentos.' });
    }
});

// GET /transparencia/form - Formulário de upload (Apenas Admin)
router.get('/form', isAdmin, (req, res) => {
    res.render('form_transparencia', { 
        types: typesMap, 
        error: req.flash('error'),
        success: req.flash('success'),
        user: req.user,
        isAdmin: req.isAdmin
    });
});

// POST /transparencia/form - Processa o upload
router.post('/form', isAdmin, uploadTransparencia.single('arquivo'), async (req, res) => {
    if (!req.file) {
        req.flash('error', 'É necessário enviar um arquivo (PDF ou Imagem).');
        return res.redirect('/transparencia/form');
    }

    const { filename } = req.file;
    const { titulo, tipo, ano, descricao } = req.body;

    if (!titulo || !tipo || !ano) {
        // Se faltar dados, remove o arquivo enviado para não deixar lixo
        await fs.unlink(req.file.path).catch(err => console.error("Erro ao limpar arquivo:", err));
        req.flash('error', 'Todos os campos obrigatórios devem ser preenchidos.');
        return res.redirect('/transparencia/form');
    }

    try {
        const sql = `INSERT INTO transparencia (titulo, tipo, ano, arquivo, descricao) VALUES ($1, $2, $3, $4, $5)`;
        await executeQuery(sql, [titulo, tipo, parseInt(ano), filename, descricao]);

        req.flash('success', 'Documento publicado com sucesso!');
        res.redirect(`/transparencia/lista/${tipo}`);
    } catch (error) {
        console.error("[transparenciaRoutes POST /form] Erro:", error);
        // Remove o arquivo em caso de erro no banco
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(err => console.error("Erro ao remover arquivo após falha:", err));
        }
        req.flash('error', 'Erro ao salvar documento no banco de dados.');
        res.redirect('/transparencia/form');
    }
});

// POST /transparencia/delete/:id/:arq - Deleta documento
router.post('/delete/:id/:arq', isAdmin, async (req, res) => {
    const { id, arq } = req.params;
    
    try {
        // Busca o tipo antes de deletar para redirecionar corretamente
        const [doc] = await executeQuery('SELECT tipo FROM transparencia WHERE id = $1', [id]);
        const tipoRedirect = doc ? doc.tipo : '';

        // Deleta do banco
        await executeQuery('DELETE FROM transparencia WHERE id = $1', [id]);

        // Deleta o arquivo físico
        const uploadsDir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'transparencia');
        const filePath = path.join(uploadsDir, path.basename(arq));
        
        await fs.unlink(filePath).catch(err => {
            if (err.code !== 'ENOENT') console.error(`[transparenciaRoutes] Erro ao deletar arquivo ${filePath}:`, err.message);
        });

        req.flash('success', 'Documento removido com sucesso.');
        if (tipoRedirect) {
            res.redirect(`/transparencia/lista/${tipoRedirect}`);
        } else {
            res.redirect('/transparencia');
        }
    } catch (error) {
        console.error("[transparenciaRoutes POST /delete] Erro:", error);
        req.flash('error', 'Erro ao remover documento.');
        res.redirect('/transparencia');
    }
});

module.exports = router;