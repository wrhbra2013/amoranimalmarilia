const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database/queries');
const { insert_transparencia } = require('../database/insert');
const { isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração local do Multer para Transparência
const storageTransparencia = multer.diskStorage({
    destination: function (req, file, cb) {
        // Caminho: ../amoranimal_uploads/transparencia
        const dir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'transparencia');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Remove caracteres especiais do nome original para evitar problemas
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, Date.now() + '-' + safeName);
    }
});
const uploadTransparencia = multer({ 
    storage: storageTransparencia,
    limits: { fileSize: 8 * 1024 * 1024 } // Limite de 8MB
});

const types = {
    'estatuto': 'Estatuto Social',
    'diretoria': 'Diretoria e Conselho Fiscal',
    'balanco': 'Balanços e Demonstrativo de Resultados',
    'financeiro': 'Relatórios Financeiros',
    'atividades': 'Relatório de Atividades',
    'colaboracao': 'Termos de Colaboração',
    'plano': 'Plano de Trabalho'
};

// GET /transparencia - Dashboard
router.get('/', (req, res) => {
    res.render('transparencia_dashboard', {
        types: types,
        isAdmin: req.session.user && req.session.user.isAdmin
    });
});

// GET /transparencia/form - Formulário de Upload (Admin)
router.get('/form', isAdmin, (req, res) => {
    res.render('form_transparencia', {
        types: types,
        formData: req.flash('formData')[0] || {},
        error: req.flash('error')
    });
});

// POST /transparencia/form - Processa Upload (Admin)
router.post('/form', isAdmin, (req, res, next) => {
    uploadTransparencia.single('arquivo')(req, res, function (err) {
        if (err) {
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                req.flash('error', 'O arquivo é muito grande. O tamanho máximo permitido é 8MB.');
            } else {
                req.flash('error', 'Erro no upload: ' + err.message);
            }
            req.flash('formData', req.body);
            return res.redirect('/transparencia/form');
        }
        next();
    });
}, async (req, res) => {
    if (!req.file) {
        req.flash('error', 'Selecione um arquivo PDF ou imagem.');
        req.flash('formData', req.body);
        return res.redirect('/transparencia/form');
    }

    const { titulo, tipo, ano, descricao } = req.body;
    const arquivo = req.file.filename;

    try {
        await insert_transparencia(titulo, tipo, parseInt(ano), arquivo, descricao);
        req.flash('success', 'Documento publicado com sucesso!');
        res.redirect('/transparencia');
    } catch (error) {
        console.error("Erro ao salvar documento de transparência:", error);
        
        // Remove o arquivo se falhar no banco
        try {
            fs.unlinkSync(req.file.path);
        } catch (e) { console.error("Erro ao remover arquivo órfão:", e); }

        req.flash('error', 'Erro ao salvar dados. Tente novamente.');
        req.flash('formData', req.body);
        res.redirect('/transparencia/form');
    }
});

// GET /transparencia/lista/:tipo - Lista de documentos
router.get('/lista/:tipo', async (req, res) => {
    const { tipo } = req.params;
    
    if (!types[tipo]) {
        return res.redirect('/transparencia');
    }

    try {
        // Busca documentos do tipo específico
        const docs = await executeQuery("SELECT * FROM transparencia WHERE tipo = $1 ORDER BY ano DESC, origem DESC", [tipo]);
        
        res.render('transparencia_lista', { // Assumindo que existe ou você criará esta view
            tipo: tipo,
            titulo: types[tipo],
            docs: docs,
            isAdmin: req.session.user && req.session.user.isAdmin
        });
    } catch (error) {
        console.error("Erro ao buscar documentos:", error);
        res.redirect('/transparencia');
    }
});

// POST /transparencia/delete/:id/:arquivo - Excluir documento
router.post('/delete/:id/:arquivo', isAdmin, async (req, res) => {
    const { id, arquivo } = req.params;
    
    try {
        await executeQuery("DELETE FROM transparencia WHERE id = $1", [id]);
        
        const filePath = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'transparencia', arquivo);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error("Erro ao deletar arquivo físico:", err);
        }

        req.flash('success', 'Documento excluído.');
    } catch (error) {
        console.error("Erro ao excluir documento:", error);
        req.flash('error', 'Erro ao excluir documento.');
    }
    res.redirect('/transparencia');
});

module.exports = router;