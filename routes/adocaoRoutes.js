const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database/queries');
const { insert_adocao } = require('../database/insert');
const { uploadAdocao } = require('../utils/multerConfig');
const fs = require('fs').promises;
const path = require('path');
const { isAdmin } = require('../middleware/auth'); // Re-adicionando para segurança do dashboard

// ==============================================================================
// Inicialização da Tabela de Interessados
// ==============================================================================
async function ensureInteressadosTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS interessados_adocao (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            contato VARCHAR(255),
            whatsapp VARCHAR(255),
            especie VARCHAR(50),
            porte VARCHAR(50),
            caracteristicas TEXT
        );
    `;
    try {
        await executeQuery(sql);
    } catch (error) {
        console.error("Erro ao verificar/criar tabela interessados_adocao:", error);
    }
}

// Chama a verificação ao carregar o módulo
ensureInteressadosTable();

// ==============================================================================
// Helper de Matching
// ==============================================================================
/**
 * Calcula a pontuação de compatibilidade entre um pet e um candidato interessado.
 * @param {object} pet - O objeto do pet para adoção.
 * @param {object} candidato - O objeto do candidato interessado.
 * @returns {{score: number, motivos: string[]}} - Um objeto com a pontuação e os motivos.
 */
function calculateMatchScore(pet, candidato) {
    let score = 0;
    let motivos = [];

    // Normalização de strings para comparação
    const petEspecie = (pet.especie || '').toLowerCase().trim();
    const candEspecie = (candidato.especie || '').toLowerCase().trim();
    const petPorte = (pet.porte || '').toLowerCase().trim();
    const candPorte = (candidato.porte || '').toLowerCase().trim();

    // CRITÉRIO 1: Espécie (Peso Alto - 50 pontos)
    if (candEspecie === 'qualquer' || candEspecie === petEspecie) {
        score += 50;
        motivos.push('Espécie compatível');
    } else {
        return { score: 0, motivos: ['Espécie incompatível'] }; // Incompatível, retorna score 0
    }

    // CRITÉRIO 2: Porte (Peso Médio - 30 pontos)
    if (candPorte === 'qualquer' || candPorte === petPorte) {
        score += 30;
        motivos.push('Porte compatível');
    }

    // CRITÉRIO 3: Palavras-chave nas características (Peso Variável - 5 pontos por termo)
    if (candidato.caracteristicas && pet.caracteristicas) {
        const keywords = candidato.caracteristicas.toLowerCase().split(/[\s,;.]+/);
        const petDesc = pet.caracteristicas.toLowerCase();
        const ignoredWords = ['muito', 'pouco', 'gosta', 'quer', 'animal', 'tenho'];

        let matchesCount = 0;
        keywords.forEach(word => {
            if (word.length > 3 && !ignoredWords.includes(word) && petDesc.includes(word)) {
                matchesCount++;
            }
        });

        if (matchesCount > 0) {
            score += (matchesCount * 5);
            motivos.push(`Características em comum (${matchesCount} termos)`);
        }
    }

    return { score, motivos };
}

// ==============================================================================
// SISTEMA DE MATCHING (Detalhes para um pet)
// ==============================================================================
router.get('/match/:id', async (req, res) => {
    const petId = req.params.id;

    try {
        const [pet] = await executeQuery('SELECT * FROM adocao WHERE id = $1', [petId]);
        if (!pet) {
            return res.status(404).render('error', { error: 'Pet não encontrado para análise de compatibilidade.' });
        }

        const interessados = await executeQuery('SELECT * FROM interessados_adocao');

        const matches = interessados.map(candidato => {
            const { score, motivos } = calculateMatchScore(pet, candidato);
            return { candidato, score, motivos };
        })
        .filter(m => m.score > 0) // Mostra qualquer um com pontuação, mesmo que baixa
        .sort((a, b) => b.score - a.score);

        res.render('adocao_match_result', {
            pet,
            matches
        });
    } catch (error) {
        console.error("[adocaoRoutes GET /match] Erro:", error);
        res.status(500).render('error', { error: 'Erro ao processar compatibilidade de adoção.' });
    }
});

// ==============================================================================
// ROTAS PADRÃO (Listagem pública e Gerenciamento)
// ==============================================================================

// GET /adocao - Dashboard Público de Adoção
router.get('/', async (req, res) => {
    try {
        // Garante que a tabela existe antes de consultar
        await ensureInteressadosTable();

        // 1. Buscar dados brutos
        const [petsCount] = await executeQuery('SELECT COUNT(*) as total FROM adocao');
        const [interessadosCount] = await executeQuery('SELECT COUNT(*) as total FROM interessados_adocao');
        const pets = await executeQuery('SELECT * FROM adocao ORDER BY id DESC');
        const interessados = await executeQuery('SELECT * FROM interessados_adocao');

        // 2. Processar matches para cada pet
        const petsComMatches = pets.map(pet => {
            const matches = interessados.filter(candidato => calculateMatchScore(pet, candidato).score >= 50);
            return { ...pet, matchCount: matches.length };
        });

        // 3. Renderizar o dashboard
        res.render('adocao_dashboard', {
            stats: {
                totalPets: petsCount ? petsCount.total : 0,
                totalInteressados: interessadosCount ? interessadosCount.total : 0
            },
            pets: petsComMatches,
            actions: [
                { label: 'Cadastrar Novo Pet', url: '/adocao/form', icon: 'fa-paw' },
                { label: 'Cadastrar Interessado', url: '/adocao/interessados/form', icon: 'fa-user-plus' }
            ]
        });
    } catch (error) {
        console.error("[adocaoRoutes GET /] Erro:", error);
        res.status(500).render('error', { error: 'Erro ao carregar o dashboard de adoção.' });
    }
});

// GET /adocao/form - Formulário de cadastro (Admin)
router.get('/form', (req, res) => {
    res.render('form_adocao');
});

// POST /adocao/form - Processa o formulário de cadastro de pet
router.post('/form', uploadAdocao.single('arquivo'), async (req, res) => {
    if (!req.file) {
        req.flash('error', 'É necessário enviar uma foto do pet.');
        return res.redirect('/adocao/form');
    }

    const { filename } = req.file;
    const { nome, idade, especie, porte, caracteristicas, tutor, contato, whatsapp } = req.body;

    try {
        await insert_adocao(filename, nome, idade, especie, porte, caracteristicas, tutor, contato, whatsapp);
        req.flash('success', 'Pet cadastrado para adoção com sucesso!');
        res.redirect('/adocao'); // Redireciona para o dashboard após o cadastro
    } catch (error) {
        console.error("[adocaoRoutes POST /form] Erro:", error);
        // Remove o arquivo enviado em caso de erro no banco
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(err => console.error("Erro ao remover arquivo após falha:", err));
        }
        req.flash('error', 'Erro ao cadastrar pet. Tente novamente.');
        res.redirect('/adocao/form');
    }
});

// POST /adocao/delete/:id/:arq - Deleta um registro de pet
router.post('/delete/:id/:arq', isAdmin, async (req, res) => {
    const { id, arq } = req.params;
    try {
        // Deleta do banco de dados
        await executeQuery('DELETE FROM adocao WHERE id = $1', [id]);

        // Deleta o arquivo físico
        const uploadsDir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'adocao');
        const filePath = path.join(uploadsDir, path.basename(arq));
        await fs.unlink(filePath).catch(err => {
            if (err.code !== 'ENOENT') console.error(`[adocaoRoutes] Erro ao deletar arquivo ${filePath}:`, err.message);
        });

        req.flash('success', 'Pet removido com sucesso.');
        res.redirect('/adocao'); // Redireciona para o dashboard após deletar
    } catch (error) {
        console.error("[adocaoRoutes POST /delete] Erro:", error);
        req.flash('error', 'Erro ao remover pet.');
        res.redirect('/adocao');
    }
});

// ==============================================================================
// ROTAS DE INTERESSADOS (Candidatos à Adoção)
// ==============================================================================

// GET /adocao/interessados/form - Formulário para interessados
router.get('/interessados/form', (req, res) => {
    // Renderiza um formulário simples (pode reutilizar form_adocao com adaptações ou criar um novo)
    // Como não temos o arquivo 'form_interesse_adocao.ejs' no contexto, vou sugerir renderizar 'form_adotante' ou similar,
    // mas o ideal é ter uma view específica. Vou assumir que você criará 'form_interesse_adocao'.
    res.render('form_interesse_adocao', { error: req.flash('error'), success: req.flash('success') });
});

// POST /adocao/interessados/form - Salva o interessado
router.post('/interessados/form', async (req, res) => {
    const { nome, contato, whatsapp, especie, porte, caracteristicas } = req.body;

    try {
        await executeQuery(
            `INSERT INTO interessados_adocao (nome, contato, whatsapp, especie, porte, caracteristicas) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [nome, contato, whatsapp, especie, porte, caracteristicas]
        );
        
        req.flash('success', 'Seu interesse foi registrado! Entraremos em contato se houver um match.');
        res.redirect('/adocao');
    } catch (error) {
        console.error("[adocaoRoutes POST /interessados/form] Erro:", error);
        req.flash('error', 'Erro ao registrar interesse.');
        res.redirect('/adocao/interessados/form');
    }
});

module.exports = router;