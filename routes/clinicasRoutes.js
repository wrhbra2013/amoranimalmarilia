// /home/wander/Public/amoranimalmarilia/routes/clinicasRoutes.js
const express = require('express');
const { pool } = require('../database/database');

const router = express.Router();

// GET /clinicas/form - Renderiza o formulário para nova clínica
router.get('/form', (req, res) => {
    res.render('form_clinica', {
        error: req.flash('error'),
        formData: req.flash('formData')[0] || {}
    });
});

// POST /clinicas/form - Processa o formulário de nova clínica
router.post('/form', async (req, res) => {
    const { nome, endereco, telefone } = req.body;

    if (!nome || nome.trim() === '') {
        req.flash('error', 'O nome da clínica não pode ser vazio.');
        req.flash('formData', req.body);
        return res.redirect('/clinicas/form');
    }

    const clinicaNome = nome.trim();

    try {
        // Insere a nova clínica ou atualiza os dados se o nome já existir.
        const insertClinicaSql = `
            INSERT INTO clinicas (nome, endereco, telefone) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (nome) DO UPDATE SET
                endereco = EXCLUDED.endereco,
                telefone = EXCLUDED.telefone;`;
        await pool.query(insertClinicaSql, [clinicaNome, endereco, telefone]);
        
        console.log(`[clinicasRoutes POST /form] Clínica "${clinicaNome}" inserida ou atualizada.`);
        
        res.redirect(`/castracao/form?new_clinic_name=${encodeURIComponent(clinicaNome)}`);

    } catch (dbError) {
        console.error(`[clinicasRoutes POST /form] Erro ao inserir/atualizar clínica:`, dbError);
        req.flash('error', 'Falha ao cadastrar a nova clínica no banco de dados.');
        req.flash('formData', req.body);
        res.redirect('/clinicas/form');
    }
});

module.exports = router;