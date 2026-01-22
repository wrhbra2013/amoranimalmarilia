const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database/queries');
const { insert_solicitacao_acesso, insert_transparencia } = require('../database/insert');
const { isAdmin } = require('../middleware/auth');
const crypto = require('crypto');
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
const uploadTransparencia = multer({ storage: storageTransparencia });

const types = {
    'estatuto': 'Estatuto Social',
    'diretoria': 'Diretoria e Conselho Fiscal',
    'balanco': 'Balanços e Demonstrativo de Resultados',
    'financeiro': 'Relatórios Financeiros',
    'atividades': 'Relatório de Atividades',
    'colaboracao': 'Termos de Colaboração',
    'plano': 'Plano de Trabalho'
};

// Middleware para verificar permissão de acesso
async function checkAccessPermission(req, res, next) {
    // 1. Se for admin, libera
    if (req.session.user && req.session.user.isAdmin) {
        return next();
    }

    // 2. Verifica se tem CPF aprovado na sessão
    const cpf = req.session.transparencia_cpf;
    if (!cpf) {
        return res.redirect('/transparencia/identificacao');
    }

    // 3. Verifica status do CPF no banco (segurança extra)
    try {
        const [request] = await executeQuery("SELECT status FROM solicitacao_acesso WHERE cpf = $1", [cpf]);
        
        if (request && request.status === 'APROVADO') {
            return next();
        } else {
            // Rejeitado ou não encontrado
            return res.redirect('/transparencia/identificacao');
        }
    } catch (error) {
        console.error("Erro ao verificar permissão:", error);
        res.redirect('/home');
    }
}

// GET /transparencia/identificacao - Formulário de Identificação
router.get('/identificacao', (req, res) => {
    res.render('transparencia_identificacao', { 
        step: 'login', // 'login' ou 'cadastro'
        message: null,
        cpfValue: ''
    });
});

// POST /transparencia/identificacao - Verifica CPF (Login)
router.post('/identificacao', async (req, res) => {
    const { cpf } = req.body;
    // Remove caracteres não numéricos para busca
    const cpfLimpo = cpf.replace(/\D/g, '');

    try {
        const [solicitacao] = await executeQuery("SELECT * FROM solicitacao_acesso WHERE cpf = $1", [cpfLimpo]);

        if (solicitacao) {
            if (solicitacao.status === 'APROVADO') {
                req.session.transparencia_cpf = cpfLimpo;
                return res.redirect('/transparencia');
            } else if (solicitacao.status === 'PENDENTE') {
                return res.render('transparencia_identificacao', { 
                    step: 'login',
                    message: 'Sua solicitação ainda está em análise. Aguarde a aprovação.',
                    cpfValue: cpf
                });
            } else {
                return res.render('transparencia_identificacao', { 
                    step: 'login',
                    message: 'Sua solicitação foi rejeitada. Entre em contato com a administração.',
                    cpfValue: cpf
                });
            }
        } else {
            // CPF não encontrado, exibe formulário de cadastro
            return res.render('transparencia_identificacao', { 
                step: 'cadastro',
                message: 'CPF não encontrado. Por favor, preencha o cadastro abaixo para solicitar acesso.',
                cpfValue: cpf // Mantém o valor digitado para preencher o form
            });
        }
    } catch (error) {
        console.error("Erro ao verificar CPF:", error);
        res.redirect('/transparencia/identificacao');
    }
});

// POST /transparencia/cadastro - Processa novo cadastro
router.post('/cadastro', async (req, res) => {
    const { nome, organizacao, telefone, email, cpf } = req.body;
    const cpfLimpo = cpf.replace(/\D/g, '');
    const token = crypto.randomBytes(32).toString('hex'); // Mantido para compatibilidade, mas o login agora é via CPF

    try {
        // Verifica se já existe solicitação para este CPF
        const [existing] = await executeQuery("SELECT status FROM solicitacao_acesso WHERE cpf = $1", [cpfLimpo]);
        
        if (existing) {
            let msg = 'Este CPF já possui uma solicitação registrada.';
            if (existing.status === 'PENDENTE') {
                msg = 'Já existe uma solicitação em análise para este CPF. Aguarde a aprovação.';
            } else if (existing.status === 'APROVADO') {
                msg = 'Este CPF já possui acesso aprovado. Por favor, faça o login.';
            } else if (existing.status === 'REJEITADO') {
                msg = 'A solicitação para este CPF foi rejeitada anteriormente.';
            }
            
            return res.render('transparencia_identificacao', { 
                step: 'login',
                message: msg,
                cpfValue: cpf
            });
        }

        // Inserção direta para garantir o campo CPF
        await executeQuery(
            "INSERT INTO solicitacao_acesso (nome, organizacao, telefone, email, token, cpf, status) VALUES ($1, $2, $3, $4, $5, $6, 'PENDENTE')",
            [nome, organizacao, telefone, email, token, cpfLimpo]
        );
        
        res.render('transparencia_identificacao', { 
            step: 'login',
            message: 'Solicitação enviada com sucesso! Aguarde a aprovação do administrador. Assim que aprovado, basta digitar seu CPF aqui para entrar.',
            cpfValue: ''
        });
    } catch (error) {
        console.error("Erro ao salvar solicitação:", error);
        res.render('transparencia_identificacao', { 
            step: 'cadastro',
            message: 'Erro ao processar cadastro. Tente novamente.',
            cpfValue: cpf
        });
    }
});

// GET /transparencia - Dashboard
router.get('/', checkAccessPermission, (req, res) => {
    res.render('transparencia_dashboard', {
        types: types,
        isAdmin: req.session.user && req.session.user.isAdmin
    });
});

// GET /transparencia/form - Formulário de Upload (Admin)
router.get('/form', isAdmin, (req, res) => {
    res.render('transparencia_form', {
        types: types,
        formData: req.flash('formData')[0] || {},
        error: req.flash('error')
    });
});

// POST /transparencia/form - Processa Upload (Admin)
router.post('/form', isAdmin, uploadTransparencia.single('arquivo'), async (req, res) => {
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

// GET /transparencia/lista/:tipo - Lista de documentos (Protegida)
router.get('/lista/:tipo', checkAccessPermission, async (req, res) => {
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

// ==============================================================================
// ÁREA ADMINISTRATIVA
// ==============================================================================

// GET /transparencia/admin/solicitacoes - Lista solicitações
router.get('/admin/solicitacoes', isAdmin, async (req, res) => {
    try {
        const solicitacoes = await executeQuery("SELECT * FROM solicitacao_acesso ORDER BY created_at DESC");
        res.render('admin_solicitacoes', { 
            solicitacoes: solicitacoes,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error("Erro ao listar solicitações:", error);
        res.redirect('/transparencia');
    }
});

// POST /transparencia/admin/solicitacoes/:id/:acao - Aprovar/Rejeitar
router.post('/admin/solicitacoes/:id/:acao', isAdmin, async (req, res) => {
    const { id, acao } = req.params;
    let status;

    if (acao === 'aprovar') status = 'APROVADO';
    else if (acao === 'rejeitar') status = 'REJEITADO';
    else if (acao === 'excluir') {
        await executeQuery("DELETE FROM solicitacao_acesso WHERE id = $1", [id]);
        req.flash('success', 'Solicitação excluída.');
        return res.redirect('/transparencia/admin/solicitacoes');
    } else {
        return res.redirect('/transparencia/admin/solicitacoes');
    }

    try {
        await executeQuery("UPDATE solicitacao_acesso SET status = $1 WHERE id = $2", [status, id]);
        req.flash('success', `Solicitação ${status === 'APROVADO' ? 'aprovada' : 'rejeitada'} com sucesso.`);
    } catch (error) {
        console.error("Erro ao atualizar solicitação:", error);
        req.flash('error', 'Erro ao atualizar status.');
    }

    res.redirect('/transparencia/admin/solicitacoes');
});

module.exports = router;