const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database/queries');
const { insert_adocao } = require('../database/insert');
const { uploadAdocao, uploadTermo } = require('../utils/multerConfig');
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
            cidade VARCHAR(100),
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

// Migração para adicionar colunas novas na tabela de interessados
async function migrateInteressadosTable() {
    const columns = [
        { name: 'cidade', type: 'VARCHAR(100)' }
    ];

    for (const col of columns) {
        try {
            await executeQuery(`ALTER TABLE interessados_adocao ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        } catch (error) {
            // Ignora erro se coluna já existir ou tabela não estiver pronta
        }
    }
}

// Inicialização da Tabela de Termo de Responsabilidade
async function ensureTermoTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS termo_responsabilidade (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            cpf VARCHAR(20),
            rg VARCHAR(20),
            endereco VARCHAR(255),
            contato VARCHAR(100),
            whatsapp VARCHAR(20),
            email VARCHAR(255),
            pet_interesse VARCHAR(255),
            arquivo VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await executeQuery(sql);
    } catch (error) {
        console.error("Erro ao verificar/criar tabela termo_responsabilidade:", error);
    }
}

// Chama a verificação ao carregar o módulo
ensureInteressadosTable();
migrateInteressadosTable();
ensureTermoTable();

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
    // Normaliza e padroniza espécies (ex: 'gato' -> 'felino')
    function normalizeSpecies(val) {
        if (!val) return '';
        let s = String(val).toLowerCase().trim();
        // Remove acentos
        s = s.normalize ? s.normalize('NFD').replace(/\p{Diacritic}/gu, '') : s.replace(/[\u0300-\u036f]/g, '');
        // Mapear sinônimos comuns
        const gatos = ['gato', 'gatos', 'gatinho', 'gatinhos', 'felino', 'felinos'];
        const caes = ['cao', 'caes', 'cachorro', 'cachorros', 'canino', 'caninos', 'cachorinho'];
        if (gatos.includes(s)) return 'felino';
        if (caes.includes(s)) return 'canino';
        return s;
    }

    const petEspecie = normalizeSpecies(pet.especie);
    const candEspecie = normalizeSpecies(candidato.especie);
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
// ROTAS DE ADOÇÃO FÍSICA (Prioritárias)
// ==============================================================================

// GET /adocao/fisica - Página intermediária para Adoção Física (Cadastro Simplificado ou Seleção)
router.get('/fisica', async (req, res) => {
    try {
        // Busca apenas pets disponíveis (opcionalmente poderia filtrar por status se houvesse)
        const pets = await executeQuery('SELECT id, nome, especie FROM adocao ORDER BY nome ASC');
        res.render('adocao_fisica', { pets });
    } catch (error) {
        console.error("[adocaoRoutes GET /fisica] Erro:", error);
        res.redirect('/adocao');
    }
});

// POST /adocao/fisica/selecionar - Redireciona pet existente para o termo
router.post('/fisica/selecionar', (req, res) => {
    const { petId } = req.body;
    if (petId) {
        res.redirect(`/adocao/termo/form?petId=${petId}`);
    } else {
        res.redirect('/adocao/fisica');
    }
});

// POST /adocao/fisica - Processa o cadastro simplificado e redireciona para o termo
router.post('/fisica', uploadAdocao.single('arquivo'), async (req, res) => {
    if (!req.file) {
        req.flash('error', 'Foto do pet é obrigatória.');
        return res.redirect('/adocao/fisica');
    }

    const filename = req.file.filename;
    const { nome, especie, idade, porte, caracteristicas } = req.body;
    
    // Valores padrão para campos não preenchidos no form simplificado
    const tutor = "Adoção Física";
    const contato = "Presencial";
    const whatsapp = "";
    const termo_arquivo = null;

    try {
        const result = await insert_adocao(filename, nome, idade, especie, porte, caracteristicas, tutor, contato, whatsapp, termo_arquivo);
        const newPetId = result ? result.insertId : null;
        
        req.flash('success', 'Pet cadastrado! Prossiga com a assinatura do termo.');
        res.redirect(`/adocao/termo/form?petId=${newPetId}`);
    } catch (error) {
        console.error("[adocaoRoutes POST /fisica] Erro:", error);
        req.flash('error', 'Erro ao cadastrar pet simplificado.');
        res.redirect('/adocao/fisica');
    }
});

// ==============================================================================
// ROTA DE COMPATIBILIDADE (Prioritária)
// ==============================================================================

// GET /adocao/compatibilidade - Lista de pets e análise de compatibilidade
router.get('/compatibilidade', async (req, res) => {
    try {
        // Reutiliza a lógica de busca e matching
        const pets = await executeQuery('SELECT * FROM adocao ORDER BY id DESC');
        const interessados = await executeQuery('SELECT * FROM interessados_adocao');

        const petsComMatches = pets.map(pet => {
            const matchesDetail = interessados
                .map(candidato => {
                    const { score, motivos } = calculateMatchScore(pet, candidato);
                    return { candidato, score, motivos };
                })
                .filter(m => m.score > 0)
                .sort((a, b) => b.score - a.score);

            return { ...pet, matchCount: matchesDetail.length, matchesDetail };
        });

        res.render('adocao_compatibilidade', {
            pets: petsComMatches,
            stats: {
                totalPets: pets.length,
                totalInteressados: interessados.length
            }
        });
    } catch (error) {
        console.error("[adocaoRoutes GET /compatibilidade] Erro:", error);
        res.status(500).render('error', { error: 'Erro ao carregar análise de compatibilidade.' });
    }
});

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
        const pets = await executeQuery('SELECT * FROM adocao ORDER BY id DESC');
        const interessados = await executeQuery('SELECT * FROM interessados_adocao ORDER BY id DESC');

        // 2. Processar matches para cada pet
        // Agora consideramos quaisquer candidatos com pontuação > 0 como potenciais matches
        // (anteriormente havia um corte >= 50 que podia esconder muitos candidatos relevantes)
        const petsComMatches = pets.map(pet => {
            const matchesDetail = interessados
                .map(candidato => {
                    const { score, motivos } = calculateMatchScore(pet, candidato);
                    return { candidato, score, motivos };
                })
                .filter(m => m.score > 0)
                .sort((a, b) => b.score - a.score);

            // Debug: se não houver matches, logar detalhes para investigar possíveis incompatibilidades
            if (matchesDetail.length === 0) {
                console.info(`[adocaoRoutes] Sem matches para pet id=${pet.id} nome="${pet.nome}" especie="${pet.especie}" porte="${pet.porte}". Verificando candidatos (${interessados.length}):`);
                interessados.forEach(c => {
                    const { score, motivos } = calculateMatchScore(pet, c);
                    console.info(`  candidato id=${c.id || 'N/A'} nome="${c.nome || 'N/D'}" especie="${c.especie}" porte="${c.porte}" -> score=${score} motivos=${JSON.stringify(motivos)}`);
                });
            }

            return { ...pet, matchCount: matchesDetail.length, matchesDetail };
        });

        // 3. Renderizar o dashboard
        res.render('adocao_dashboard', {
            pets: petsComMatches,
        });
    } catch (error) {
        console.error("[adocaoRoutes GET /] Erro:", error);
        res.status(500).render('error', { error: 'Erro ao carregar o dashboard de adoção.' });
    }
});

// GET /adocao/form
router.get('/form',  (req, res) => {
    res.render('form_adocao');
});

// POST /adocao/form - Processa o formulário de cadastro de pet
router.post('/form',  uploadAdocao.fields([{ name: 'arquivo', maxCount: 1 }, { name: 'termo', maxCount: 1 }]), async (req, res) => {
    if (!req.files || !req.files['arquivo']) {
        req.flash('error', 'É necessário enviar uma foto do pet.');
        return res.redirect('/adocao/form');
    }

    const filename = req.files['arquivo'][0].filename;
    const termoFilename = req.files['termo'] ? req.files['termo'][0].filename : null;
    const { nome, idade, especie, porte, caracteristicas, tutor, contato, whatsapp } = req.body;

    try {
        await insert_adocao(filename, nome, idade, especie, porte, caracteristicas, tutor, contato, whatsapp, termoFilename);
        req.flash('success', 'Pet cadastrado para adoção com sucesso!');
        res.redirect('/adocao'); // Redireciona para o dashboard após o cadastro
    } catch (error) {
        console.error("[adocaoRoutes POST /form] Erro:", error);
        // Remove o arquivo enviado em caso de erro no banco
        if (req.files['arquivo']) {
            await fs.unlink(req.files['arquivo'][0].path).catch(err => console.error("Erro ao remover arquivo de foto após falha:", err));
        }
        if (req.files['termo']) {
            await fs.unlink(req.files['termo'][0].path).catch(err => console.error("Erro ao remover arquivo de termo após falha:", err));
        }
        req.flash('error', 'Erro ao cadastrar pet. Tente novamente.');
        res.redirect('/adocao/form');
    }
});

// POST /adocao/delete/:id/:arq - Deleta um registro de pet
router.post('/delete/:id/:arq', isAdmin, async (req, res) => {
    const { id, arq } = req.params;
    try {
        // Busca o pet para verificar se existe um termo associado antes de deletar
        const [pet] = await executeQuery('SELECT termo_arquivo FROM adocao WHERE id = $1', [id]);

        // Deleta do banco de dados
        await executeQuery('DELETE FROM adocao WHERE id = $1', [id]);

        // Deleta o arquivo físico
        const uploadsDir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'adocao');
        const filePath = path.join(uploadsDir, path.basename(arq));
        await fs.unlink(filePath).catch(err => {
            if (err.code !== 'ENOENT') console.error(`[adocaoRoutes] Erro ao deletar arquivo ${filePath}:`, err.message);
        });

        // Deleta o arquivo do termo se existir
        if (pet && pet.termo_arquivo) {
            const termoPath = path.join(uploadsDir, path.basename(pet.termo_arquivo));
            await fs.unlink(termoPath).catch(err => {
                if (err.code !== 'ENOENT') console.error(`[adocaoRoutes] Erro ao deletar termo ${termoPath}:`, err.message);
            });
        }

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
    const { 
        nome, telefone, cidade, especie, porte, caracteristicas
    } = req.body;

    try {
        await executeQuery(
            `INSERT INTO interessados_adocao (
                nome, contato, cidade, especie, porte, caracteristicas
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                nome, telefone, cidade, especie, porte, caracteristicas
            ]
        );
        
        req.flash('success', 'Seu interesse foi registrado! Entraremos em contato se houver um match.');
        res.redirect('/adocao');
    } catch (error) {
        console.error("[adocaoRoutes POST /interessados/form] Erro:", error);
        req.flash('error', 'Erro ao registrar interesse.');
        res.redirect('/adocao/interessados/form');
    }
});

// ==============================================================================
// ROTAS DE TERMO DE RESPONSABILIDADE
// ==============================================================================

// GET /adocao/termo/form - Formulário para termo de responsabilidade
router.get('/termo/form', async (req, res) => {
    const { petId } = req.query;
    let pet = null;
    let pets = [];
    
    try {
        // Busca lista completa de pets para o dropdown
        pets = await executeQuery('SELECT id, nome FROM adocao ORDER BY nome ASC');

        if (petId) {
            const result = await executeQuery('SELECT * FROM adocao WHERE id = $1', [petId]);
            if (result.length > 0) pet = result[0];
        }
    } catch (error) {
        console.error("Erro ao buscar dados para termo:", error);
    }

    res.render('form_termo_responsabilidade', { 
        error: req.flash('error'), 
        success: req.flash('success'),
        petId: petId || '',
        petNome: pet ? pet.nome : '',
        pets: pets
    });
});

// POST /adocao/termo/form - Salva o termo assinado
router.post('/termo/form',  uploadTermo.single('arquivo_id'), async (req, res) => {
    const { nome, cpf, rg, endereco, contato, whatsapp, email, pet_interesse, petId } = req.body;
    const arquivo = req.file ? req.file.filename : null;

    // O campo 'pet_interesse' recebe o NOME do pet (value do select)
    // O campo 'petId' recebe o ID do pet (do input hidden atualizado via JS)

    try {
        await executeQuery(
            `INSERT INTO termo_responsabilidade (nome, cpf, rg, endereco, contato, whatsapp, email, pet_interesse, arquivo) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [nome, cpf, rg, endereco, contato, whatsapp, email, pet_interesse, arquivo]
        );

        // Se houver um ID de pet vinculado, atualiza a tabela adocao referenciando este termo (arquivo)
        if (petId && !isNaN(petId) && arquivo) {
            await executeQuery(
                `UPDATE adocao SET termo_arquivo = $1 WHERE id = $2`,
                [arquivo, petId]
            );
            console.log(`[adocaoRoutes] Termo ${arquivo} vinculado ao Pet ID ${petId}`);
        }

        req.flash('success', 'Termo de responsabilidade registrado com sucesso!');
        res.redirect('/adocao');
    } catch (error) {
        console.error("[adocaoRoutes POST /termo/form] Erro:", error);
        req.flash('error', 'Erro ao registrar termo.');
        res.redirect('/adocao/termo/form');
    }
});

// ==============================================================================
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    // Verifica se o ID é numérico para evitar conflitos com outras rotas
    if (isNaN(id)) {
        return res.status(404).render('error', { error: 'Página não encontrada.' });
    }

    try {
        const [pet] = await executeQuery('SELECT * FROM adocao WHERE id = $1', [id]);

        if (!pet) {
            req.flash('error', 'Pet não encontrado.');
            return res.redirect('/adocao');
        }

        res.render('view_adocao', { pet, user: req.user, isAdmin: req.isAdmin });
    } catch (error) {
        console.error("[adocaoRoutes GET /:id] Erro:", error);
        res.status(500).render('error', { error: 'Erro ao carregar detalhes do pet.' });
    }
});

module.exports = router;