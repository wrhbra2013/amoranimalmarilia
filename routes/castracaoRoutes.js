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

// Rota para exibir página de sucesso após cadastro de castração
router.get('/sucesso/:ticket', async (req, res) => {
    const { ticket } = req.params;
    try {
        const result = await executeQuery('SELECT * FROM castracao WHERE ticket = $1', [ticket]);
        if (!result || result.length === 0) {
            req.flash('error', 'Castração não encontrada.');
            return res.redirect('/castracao');
        }
        res.render('castracao_sucesso', { castracao: result[0] });
    } catch (error) {
        console.error('[castracaoRoutes GET /sucesso/:ticket] Erro:', error);
        req.flash('error', 'Erro ao carregar dados.');
        res.redirect('/castracao');
    }
});

// Rota para gerar comprovante PDF
router.get('/comprovante/:ticket', async (req, res) => {
    const { ticket } = req.params;
    const PdfPrinter = require('pdfmake');
    
    try {
        const result = await executeQuery(`
            SELECT c.*, cl.endereco as clinica_endereco 
            FROM castracao c 
            LEFT JOIN clinicas cl ON c.clinica = cl.nome 
            WHERE c.ticket = $1
        `, [ticket]);
        if (!result || result.length === 0) {
            req.flash('error', 'Castração não encontrada.');
            return res.redirect('/castracao');
        }
        
        const castracao = result[0];
        
        const fontDescriptors = {
            Roboto: {
                normal: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Regular.ttf'),
                bold: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Medium.ttf'),
                italics: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Italic.ttf'),
                bolditalics: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-MediumItalic.ttf')
            }
        };
        
        const printer = new PdfPrinter(fontDescriptors);
        
        const tipoLabel = castracao.tipo === 'mutirao' ? 'Mutirão' : (castracao.tipo === 'pets_rua' ? 'Pet de Rua' : 'Baixo Custo');
        
        const logoPath = path.join(__dirname, '..', 'static', 'css', 'imagem', 'ong.jpg');
        const emitDate = new Date().toLocaleDateString('pt-BR');
        const emitTime = new Date().toLocaleTimeString('pt-BR');
        
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [40, 80, 40, 50],
            header: {
                margin: [20, 10, 20, 0],
                table: {
                    widths: [70, '*', 140],
                    body: [
                        [{
                            image: logoPath,
                            width: 60,
                            alignment: 'center',
                            margin: [0, 2, 0, 2]
                        }, {
                            stack: [{
                                text: 'ONG Amor Animal Marilia',
                                style: 'headerTitle',
                                alignment: 'center'
                            }, {
                                text: 'Comprovante de Inscrição - Castração',
                                style: 'headerSubtitle',
                                alignment: 'center'
                            }, {
                                text: `Emitido em: ${emitDate} às ${emitTime}`,
                                style: 'headerDate',
                                alignment: 'center'
                            }],
                            margin: [0, 5, 0, 0]
                        }, {
                            text: 'Rua Alcides Caliman, 701\nJd. Bandeirantes\nMarília - SP\nhttps://amoranimal.ong.br',
                            style: 'addressHeader',
                            alignment: 'right',
                            margin: [0, 5, 5, 0]
                        }]
                    ]
                },
                layout: {
                    hLineWidth: function() { return 0.5; },
                    vLineWidth: function() { return 0.5; },
                    hLineColor: function() { return '#cccccc'; },
                    vLineColor: function() { return '#cccccc'; }
                }
            },
            content: [
                { text: `TICKET: ${castracao.ticket}`, style: 'ticket', alignment: 'center', margin: [0, 20, 0, 20] },
                { text: 'DADOS DO RESPONSÁVEL', style: 'subHeader', margin: [0, 0, 0, 5] },
                {
                    table: { widths: ['*', '*'], body: [
                        [{ text: 'Nome:', style: 'label' }, { text: castracao.nome || '-', style: 'value' }],
                        [{ text: 'Contato:', style: 'label' }, { text: castracao.contato || '-', style: 'value' }],
                        [{ text: 'WhatsApp:', style: 'label' }, { text: castracao.whatsapp || '-', style: 'value' }],
                        ...(castracao.locality ? [[{ text: 'Localidade:', style: 'label' }, { text: castracao.locality, style: 'value' }]] : [])
                    ]}, layout: 'lightHorizontalPadding', margin: [0, 0, 0, 15]
                },
                { text: 'DADOS DO PET', style: 'subHeader', margin: [0, 10, 0, 5] },
                {
                    table: {
                        widths: ['*', '*', '*', '*'],
                        body: [
                            [
                                { text: 'Nome', style: 'tableHeader' },
                                { text: 'Espécie', style: 'tableHeader' },
                                { text: 'Porte', style: 'tableHeader' },
                                { text: 'Idade', style: 'tableHeader' }
                            ],
                            [
                                { text: castracao.nome_pet || '-', style: 'tableCell' },
                                { text: castracao.especie ? (castracao.especie.charAt(0).toUpperCase() + castracao.especie.slice(1)) : '-', style: 'tableCell' },
                                { text: castracao.porte || '-', style: 'tableCell' },
                                { text: castracao.idade ? castracao.idade + ' anos' : '-', style: 'tableCell' }
                            ]
                        ]
                    },
                    layout: {
                        hLineWidth: function() { return 0.5; },
                        vLineWidth: function() { return 0.5; },
                        hLineColor: function() { return '#cccccc'; },
                        vLineColor: function() { return '#cccccc'; }
                    },
                    margin: [0, 0, 0, 15]
                },
                { text: 'AGENDAMENTO', style: 'subHeader', margin: [0, 10, 0, 5] },
                {
                    table: { widths: ['*', '*'], body: [
                        [{ text: 'Tipo:', style: 'label' }, { text: tipoLabel, style: 'value' }],
                        [{ text: 'Clínica:', style: 'label' }, { text: (castracao.clinica || 'A definir') + (castracao.clinica_endereco ? '\n' + castracao.clinica_endereco : ''), style: 'value' }],
                        [{ text: 'Dia Preferencial:', style: 'label' }, { text: castracao.agenda || 'A definir', style: 'value' }],
                        [{ text: 'Status:', style: 'label' }, { text: castracao.status || 'PENDENTE', style: 'value' }]
                    ]}, layout: 'lightHorizontalPadding', margin: [0, 0, 0, 15]
                },
                { text: 'Guarde este comprovante para apresentação no dia da castração.', style: 'footer', alignment: 'center', margin: [0, 20, 0, 0] }
            ],
            styles: {
                headerTitle: {
                    fontSize: 14,
                    bold: true,
                    color: '#0066CC'
                },
                headerSubtitle: {
                    fontSize: 11,
                    color: '#333333'
                },
                headerDate: {
                    fontSize: 8,
                    color: '#666666'
                },
                addressHeader: {
                    fontSize: 8,
                    color: '#555555'
                },
                ticket: {
                    fontSize: 24,
                    bold: true,
                    color: '#cc0000',
                    background: '#f5f5f5'
                },
                subHeader: {
                    fontSize: 12,
                    bold: true,
                    color: '#0066CC',
                    margin: [0, 10, 0, 5]
                },
                label: {
                    fontSize: 10,
                    bold: true,
                    color: '#666666'
                },
                value: {
                    fontSize: 10,
                    color: '#333333'
                },
                tableHeader: {
                    fontSize: 9,
                    bold: true,
                    color: '#ffffff',
                    fillColor: '#0066CC'
                },
                tableCell: {
                    fontSize: 9,
                    color: '#333333'
                },
                footer: {
                    fontSize: 10,
                    italics: true,
                    color: '#666666'
                }
            }
        };
        
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=comprovante_castracao_${ticket}.pdf`);
        pdfDoc.pipe(res);
        pdfDoc.end();
        
    } catch (error) {
        console.error('[castracaoRoutes GET /comprovante/:ticket] Erro:', error);
        req.flash('error', 'Erro ao gerar comprovante.');
        res.redirect('/castracao');
    }
});

// Função para gerar ticket sequencial com prefixo por tipo
// B = baixo_custo, M = mutirao, R = pets_rua
async function generateCastracaoTicket(client, tipo = 'baixo_custo') {
    const prefixo = tipo === 'mutirao' ? 'M' : (tipo === 'pets_rua' ? 'R' : 'B');
    const pattern = `^${prefixo}[0-9]{4}$`;
    
    const result = await client.query(`
        SELECT ticket FROM castracao 
        WHERE ticket ~ $1
        ORDER BY ticket DESC LIMIT 1
    `, [pattern]);
    
    let nextNumber = 1;
    if (result.rows.length > 0) {
        const lastTicket = result.rows[0].ticket;
        const lastNumber = parseInt(lastTicket.slice(1), 10);
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }
    
    return prefixo + String(nextNumber).padStart(4, '0');
}
   
// GET /castracao - Exibe o dashboard de castração
router.get('/', async (req, res) => {
    try {
        res.render('castracao_dashboard');
    } catch (error) {
        console.error("[castracaoRoutes GET /] Erro ao renderizar dashboard:", error.message);
        res.status(500).render('error', { error: error.message || 'Não foi possível carregar o dashboard de castração.' });
    }
});

// GET /castracao/mutirao/inscrever/:id - Formulário de inscrição para mutirão específico
router.get('/mutirao/inscrever/:id', async (req, res) => {
    try {
        const mutiraoId = req.params.id;
        const [mutirao] = await executeQuery('SELECT * FROM calendario_mutirao WHERE id = $1', [mutiraoId]);
        
        if (!mutirao) {
            req.flash('error', 'Mutirão não encontrado.');
            return res.redirect('/castracao/mutirao');
        }
        
        const formData = req.flash('formData')[0] || {};
        formData.clinica = mutirao.clinica;
        formData.agenda = mutirao.data_evento ? (new Date(mutirao.data_evento)).toISOString().slice(0,10) : formData.agenda;
        formData.vagas_calendario = mutirao.vagas;
        formData.mutirao_id = mutirao.id;
        
        res.render('castracao_simplificada', { 
            clinicas: [{nome: mutirao.clinica}], 
            error: req.flash('error'),
            formData: formData,
            tipoFormulario: 'mutirao',
            titulo: 'Inscrever-se no Mutirão de Castração',
            mutirao: mutirao
        });
    } catch (error) {
        console.error("[castracaoRoutes GET /mutirao/inscrever] Erro ao carregar formulário:", error.message);
        req.flash('error', 'Não foi possível carregar o formulário. Tente novamente.');
        res.redirect('/castracao/mutirao');
    }
});

// POST /castracao/mutirao/create - Inscrever no mutirão (salva na tabela castracao)
router.post('/mutirao/create', async (req, res) => {
    const client = await pool.connect();
    try {
        const { calendario_id, mutirao_id, tutor_nome, tutor_contato, vagas_solicitadas, animais_json } = req.body;
        
        let animais = null;
        if (animais_json) {
            try { animais = JSON.parse(animais_json); } catch (e) { console.warn('animais_json parse error', e); }
        }

        const mutiraoRef = mutirao_id || calendario_id;
        
        // Gera ticket com prefixo M para mutirão
        const ticketBase = await generateCastracaoTicket(client, 'mutirao');
        
        // Salva cada animal na tabela castracao com tipo='mutirao'
        const numVagas = parseInt(vagas_solicitadas || 1, 10);
        
        // Se tiver animais_json, usa eles, senão cria 1 registro
        let pets = [];
        if (animais && animais.length > 0) {
            pets = animais;
        } else {
            pets = [{ nome: 'Pet do mutirão', especie: 'não especificado' }];
        }

        const baseNumber = parseInt(ticketBase.slice(1), 10);
        const prefixo = 'M';

        // Pegar o primeiro ticket gerado para redirecionar
        const firstTicket = prefixo + String(baseNumber).padStart(4, '0');

        for (let i = 0; i < pets.length; i++) {
            const pet = pets[i];
            const ticket = prefixo + String(baseNumber + i).padStart(4, '0');
            
            await insert_castracao(
                ticket,
                tutor_nome,
                tutor_contato,
                'sim',
                pet.idade || null,
                pet.especie || 'não especificado',
                pet.porte || 'não especificado',
                req.body.clinica || 'não especificada',
                req.body.agenda || mutiraoRef,
                'mutirao',
                pet.nome || 'Pet do mutirão',
                null
            );
        }

        req.flash('success', 'Inscrição para mutirão enviada com sucesso.');
        res.redirect('/castracao/sucesso/' + firstTicket);
    } catch (error) {
        console.error('[castracaoRoutes POST /mutirao/create] Erro ao criar inscrição de mutirão:', error);
        req.flash('error', 'Erro ao enviar inscrição. Tente novamente.');
        res.redirect('/castracao/mutirao');
    } finally {
        client.release();
    }
});

// --- Calendário de Castração (Admin) ---
// GET /castracao/calendario - lista e formulário de criação (admin)
router.get('/calendario', isAdmin, async (req, res) => {
    try {
        const calendario = await executeQuery('SELECT * FROM calendario_castracao ORDER BY data_evento;');
        res.render('calendario_castracao', { calendario: calendario, error: req.flash('error'), success: req.flash('success') });
    } catch (error) {
        console.error('[castracaoRoutes GET /calendario] Erro ao buscar calendario:', error);
        res.status(500).render('calendario_castracao', { calendario: [], error: 'Erro ao carregar calendário.' });
    }
});

// POST /castracao/calendario - cria nova data de castração (admin)
router.post('/calendario', isAdmin, async (req, res) => {
    try {
        const { data_evento, clinica, vagas } = req.body;
        if (!data_evento || !clinica) {
            req.flash('error', 'Data e clínica são obrigatórias.');
            return res.redirect('/castracao/calendario');
        }
        const insertSql = `INSERT INTO calendario_castracao (data_evento, clinica, vagas, criado_por) VALUES ($1,$2,$3,$4)`;
        await pool.query(insertSql, [data_evento, clinica, parseInt(vagas || 0, 10), req.user ? req.user.usuario || req.user.nome : null]);
        req.flash('success', 'Data de calendário criada com sucesso.');
        res.redirect('/castracao/calendario');
    } catch (error) {
        console.error('[castracaoRoutes POST /calendario] Erro ao criar calendario:', error);
        req.flash('error', 'Erro ao criar data de calendário.');
        res.redirect('/castracao/calendario');
    }
});

// --- Calendário de Mutirão (Admin) ---
// GET /castracao/calendario-mutirao - lista e formulário de criação (admin)
router.get('/calendario-mutirao', async (req, res) => {
    try {
        const calendario = await executeQuery('SELECT * FROM calendario_mutirao ORDER BY data_evento;');
        const clinicas = await executeQuery("SELECT id, nome, endereco FROM clinicas ORDER BY nome;");
        
        // Calcular vagas disponíveis para cada mutirão
        for (let mutirao of calendario) {
            if (mutirao.vagas !== 0) {
                const vagasUsadas = await executeQuery(`
                    SELECT COUNT(mp.id) as total 
                    FROM mutirao_inscricao mi 
                    JOIN mutirao_pet mp ON mi.id = mp.mutirao_inscricao_id 
                    WHERE mi.calendario_mutirao_id = $1
                `, [mutirao.id]);
                mutirao.vagas_disponiveis = mutirao.vagas - (parseInt(vagasUsadas[0]?.total) || 0);
            } else {
                mutirao.vagas_disponiveis = null; // Ilimitado
            }
        }
        
        res.render('calendario_mutirao', { calendario: calendario, clinicas: clinicas, error: req.flash('error'), success: req.flash('success') });
    } catch (error) {
        console.error('[castracaoRoutes GET /calendario-mutirao] Erro ao buscar calendario:', error);
        res.status(500).render('calendario_mutirao', { calendario: [], clinicas: [], error: 'Erro ao carregar calendário de mutirão.' });
    }
});

// POST /castracao/calendario-mutirao - cria nova data de mutirão (admin)
router.post('/calendario-mutirao', isAdmin, async (req, res) => {
    try {
        const { data_evento, clinica, vagas, endereco } = req.body;
        if (!data_evento || !clinica) {
            req.flash('error', 'Data e clínica são obrigatórias.');
            return res.redirect('/castracao/calendario-mutirao');
        }
        const insertSql = `INSERT INTO calendario_mutirao (data_evento, clinica, vagas, endereco, criado_por) VALUES ($1,$2,$3,$4,$5)`;
        await pool.query(insertSql, [data_evento, clinica, parseInt(vagas || 0, 10), endereco || null, req.user ? req.user.usuario || req.user.nome : null]);
        req.flash('success', 'Data de mutirão criada com sucesso.');
        res.redirect('/castracao/calendario-mutirao');
    } catch (error) {
        console.error('[castracaoRoutes POST /calendario-mutirao] Erro ao criar calendario:', error);
        req.flash('error', 'Erro ao criar data de mutirão.');
        res.redirect('/castracao/calendario-mutirao');
    }
});

// GET /castracao/mutirao-inscricao/:id - Renderiza formulário de inscrição
router.get('/mutirao-inscricao/:id', async (req, res) => {
    try {
        const mutiraoId = req.params.id;
        
        // Buscar dados do mutirão
        const mutiraoResult = await executeQuery('SELECT * FROM calendario_mutirao WHERE id = $1', [mutiraoId]);
        
        if (!mutiraoResult || mutiraoResult.length === 0) {
            req.flash('error', 'Mutirão não encontrado.');
            return res.redirect('/castracao/calendario-mutirao');
        }
        
        const mutirao = mutiraoResult[0];
        
        // Verificar se ainda há vagas disponíveis
        if (mutirao.vagas !== 0) {
            const vagasUsadas = await executeQuery(`
                SELECT COUNT(mp.id) as total 
                FROM mutirao_inscricao mi 
                JOIN mutirao_pet mp ON mi.id = mp.mutirao_inscricao_id 
                WHERE mi.calendario_mutirao_id = $1
            `, [mutiraoId]);
            
            const vagasDisponiveis = mutirao.vagas - (parseInt(vagasUsadas[0]?.total) || 0);
            
            if (vagasDisponiveis <= 0) {
                req.flash('error', 'Não há vagas disponíveis para este mutirão.');
                return res.redirect('/castracao/calendario-mutirao');
            }
            
            mutirao.vagas_disponiveis = vagasDisponiveis;
        } else {
            mutirao.vagas_disponiveis = null; // Ilimitado
        }
        
        res.render('mutirao_inscricao', { 
            mutirao: mutirao, 
            error: req.flash('error'), 
            success: req.flash('success') 
        });
        
    } catch (error) {
        console.error('[castracaoRoutes GET /mutirao-inscricao] Erro:', error);
        req.flash('error', 'Erro ao carregar formulário de inscrição.');
        res.redirect('/castracao/calendario-mutirao');
    }
});

// Função para gerar ticket sequencial (apenas números com 4 dígitos)
async function generateSequentialTicket(client) {
    const result = await client.query(`
        SELECT ticket FROM mutirao_inscricao 
        ORDER BY ticket DESC LIMIT 1
    `);
    
    let nextNumber = 1;
    if (result.rows.length > 0) {
        const lastTicket = result.rows[0].ticket;
        const lastNumber = parseInt(lastTicket, 10);
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }
    
    return String(nextNumber).padStart(4, '0');
}

// POST /castracao/mutirao-inscricao - Processa inscrição
router.post('/mutirao-inscricao', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { 
            calendario_mutirao_id, 
            nome_responsavel, 
            localidades, 
            contato,
            pet_nome,
            pet_especie,
            pet_sexo,
            pet_idade,
            pet_peso,
            pet_vacinado,
            pet_tem_medicamento,
            pet_medicamento
        } = req.body;
        
        // Debug: mostrar o que está chegando
        console.log('[DEBUG] POST dados recebidos:', {
            calendario_mutirao_id,
            nome_responsavel,
            contato,
            pet_nome
        });
        
        // Validar campos obrigatórios (limpando espaços)
        const contatoLimpo = contato ? String(contato).trim() : '';
        if (!calendario_mutirao_id || !nome_responsavel || !contatoLimpo) {
            throw new Error('Dados obrigatórios não preenchidos. Contato: ' + contatoLimpo);
        }
        
        // Verificar se há pets cadastrados - trata tanto array quanto valor único
        let nomesPets = [];
        if (pet_nome) {
            if (Array.isArray(pet_nome)) {
                nomesPets = pet_nome.filter(nome => nome && String(nome).trim() !== '');
            } else if (String(pet_nome).trim() !== '') {
                nomesPets = [pet_nome];
            }
        }
        
        console.log('[DEBUG] pets validados:', nomesPets);
        
        if (!pet_nome || nomesPets.length === 0) {
            throw new Error('É necessário cadastrar pelo menos um pet para realizar a inscrição.');
        }
        
        // Verificar se há vagas disponíveis
        const mutiraoResult = await client.query('SELECT vagas FROM calendario_mutirao WHERE id = $1', [calendario_mutirao_id]);
        const mutirao = mutiraoResult.rows[0];
        
        if (mutirao.vagas !== 0) {
            const vagasUsadas = await client.query(`
                SELECT COUNT(mp.id) as total 
                FROM mutirao_inscricao mi 
                JOIN mutirao_pet mp ON mi.id = mp.mutirao_inscricao_id 
                WHERE mi.calendario_mutirao_id = $1
            `, [calendario_mutirao_id]);
            
            const vagasDisponiveis = mutirao.vagas - parseInt(vagasUsadas.rows[0].total);
            const totalPets = nomesPets.length;
            
            if (vagasDisponiveis < totalPets) {
                throw new Error(`Não há vagas suficientes. Disponíveis: ${vagasDisponiveis}, Solicitadas: ${totalPets}`);
            }
        }
        
        // Gerar ticket sequencial
        const ticket = await generateSequentialTicket(client);
        
        // Inserir inscrição do responsável com ticket
        const inscricaoResult = await client.query(`
            INSERT INTO mutirao_inscricao (calendario_mutirao_id, ticket, nome_responsavel, localidades, contato) 
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [calendario_mutirao_id, ticket, nome_responsavel, localidades, contato]);
        
        const inscricaoId = inscricaoResult.rows[0].id;
        
        // Normalizar campos de pets para sempre serem arrays
        const normalizeToArray = (value) => {
            if (value === undefined || value === null) return [];
            return Array.isArray(value) ? value : [value];
        };
        
        const especieArray = normalizeToArray(pet_especie);
        const sexoArray = normalizeToArray(pet_sexo);
        const idadeArray = normalizeToArray(pet_idade);
        const pesoArray = normalizeToArray(pet_peso);
        const vacinadoArray = normalizeToArray(pet_vacinado);
        const temMedicamentoArray = normalizeToArray(pet_tem_medicamento);
        const medicamentoArray = normalizeToArray(pet_medicamento);
        
        // Criar arrays sincronizados apenas com pets válidos
        const petsSincronizados = [];
        for (let i = 0; i < nomesPets.length; i++) {
            petsSincronizados.push({
                nome: nomesPets[i],
                especie: especieArray[i] || '',
                sexo: sexoArray[i] || '',
                idade: idadeArray[i] || '',
                peso: pesoArray[i] || '',
                vacinado: vacinadoArray[i] === 'true',
                temMedicamento: temMedicamentoArray[i] === 'sim',
                medicamento: temMedicamentoArray[i] === 'sim' ? (medicamentoArray[i] || '') : ''
            });
        }
        
        // Inserir pets
        for (const pet of petsSincronizados) {
            if (!pet.especie || !pet.sexo) {
                throw new Error('Pet ' + pet.nome + ' está com espécie ou sexo vazio.');
            }
            
            await client.query(`
                INSERT INTO mutirao_pet (
                    mutirao_inscricao_id, nome, especie, sexo, idade, peso, 
                    vacinado, medicamento
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                inscricaoId,
                pet.nome,
                pet.especie,
                pet.sexo,
                pet.idade,
                pet.peso,
                pet.vacinado,
                pet.medicamento || null
            ]);
        }
        
        await client.query('COMMIT');
        
        // Redirecionar para página de sucesso com ticket
        res.redirect(`/castracao/mutirao-inscricao/sucesso/${inscricaoId}`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[castracaoRoutes POST /mutirao-inscricao] Erro:', error);
        req.flash('error', error.message || 'Erro ao realizar inscrição.');
        res.redirect(`/castracao/mutirao-inscricao/${req.body.calendario_mutirao_id}`);
    } finally {
        client.release();
    }
});

// GET /castracao/mutirao-inscricao/sucesso/:id - Página de sucesso com popup
router.get('/mutirao-inscricao/sucesso/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const inscricao = await executeQuery(`
            SELECT mi.*, cm.data_evento, cm.clinica, cm.endereco 
            FROM mutirao_inscricao mi
            JOIN calendario_mutirao cm ON mi.calendario_mutirao_id = cm.id
            WHERE mi.id = $1
        `, [id]);
        
        if (!inscricao || inscricao.length === 0) {
            req.flash('error', 'Inscrição não encontrada.');
            return res.redirect('/castracao/calendario-mutirao');
        }
        
        const pets = await executeQuery(`
            SELECT * FROM mutirao_pet WHERE mutirao_inscricao_id = $1
        `, [id]);
        
        res.render('mutirao_inscricao_sucesso', {
            inscricao: inscricao[0],
            pets: pets,
            success_msg: 'Castração Registrada com sucesso!'
        });
        
    } catch (error) {
        console.error('[castracaoRoutes GET /mutirao-inscricao/sucesso] Erro:', error);
        req.flash('error', 'Erro ao carregar dados da inscrição.');
        res.redirect('/castracao/calendario-mutirao');
    }
});

// GET /castracao/mutirao-inscricao/comprovante/:id - Gera PDF do comprovante
router.get('/mutirao-inscricao/comprovante/:id', async (req, res) => {
    const { id } = req.params;
    const PdfPrinter = require('pdfmake');
    const path = require('path');
    
    try {
        const inscricaoResult = await executeQuery(`
            SELECT mi.*, cm.data_evento, cm.clinica, cm.endereco 
            FROM mutirao_inscricao mi
            JOIN calendario_mutirao cm ON mi.calendario_mutirao_id = cm.id
            WHERE mi.id = $1
        `, [id]);
        
        if (!inscricaoResult || inscricaoResult.length === 0) {
            req.flash('error', 'Inscrição não encontrada.');
            return res.redirect('/castracao/calendario-mutirao');
        }
        
        const inscricao = inscricaoResult[0];
        const pets = await executeQuery(`
            SELECT * FROM mutirao_pet WHERE mutirao_inscricao_id = $1
        `, [id]);
        
        const fontDescriptors = {
            Roboto: {
                normal: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Regular.ttf'),
                bold: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Medium.ttf'),
                italics: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Italic.ttf'),
                bolditalics: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-MediumItalic.ttf')
            }
        };
        
        const printer = new PdfPrinter(fontDescriptors);
        
        const content = [];
        
        // Cabeçalho
        content.push({
            text: 'COMPROVANTE DE INSCRIÇÃO - MUTIRÃO DE CASTRAÇÃO',
            style: 'header',
            alignment: 'center',
            margin: [0, 0, 0, 10]
        });
        
        // Ticket em destaque
        content.push({
            text: `TICKET: ${inscricao.ticket}`,
            style: 'ticket',
            alignment: 'center',
            margin: [0, 10, 0, 20]
        });
        
        // Dados do Responsável
        content.push({
            text: 'DADOS DO RESPONSÁVEL',
            style: 'subHeader',
            margin: [0, 0, 0, 5]
        });
        
        content.push({
            table: {
                widths: ['*', '*'],
                body: [
                    [{ text: 'Nome:', style: 'label' }, { text: inscricao.nome_responsavel, style: 'value' }],
                    [{ text: 'Localidade:', style: 'label' }, { text: inscricao.localidades || 'Não informada', style: 'value' }],
                    [{ text: 'Contato:', style: 'label' }, { text: inscricao.contato, style: 'value' }]
                ]
            },
            layout: 'lightHorizontalPadding',
            margin: [0, 0, 0, 15]
        });
        
        // Dados do Mutirão
        content.push({
            text: 'DADOS DO MUTIRÃO',
            style: 'subHeader',
            margin: [0, 0, 0, 5]
        });
        
        content.push({
            table: {
                widths: ['*', '*'],
                body: [
                    [{ text: 'Data:', style: 'label' }, { text: inscricao.data_evento ? new Date(inscricao.data_evento).toLocaleDateString('pt-BR') : 'Não definida', style: 'value' }],
                    [{ text: 'Clínica:', style: 'label' }, { text: inscricao.clinica, style: 'value' }],
                    [{ text: 'Endereço:', style: 'label' }, { text: inscricao.endereco || 'Não informado', style: 'value' }]
                ]
            },
            layout: 'lightHorizontalPadding',
            margin: [0, 0, 0, 15]
        });
        
        // Pets Cadastrados
        content.push({
            text: 'PETS CADASTRADOS',
            style: 'subHeader',
            margin: [0, 0, 0, 5]
        });
        
        if (pets && pets.length > 0) {
            const petsTableBody = [
                [{ text: '#', style: 'tableHeader' }, { text: 'Nome', style: 'tableHeader' }, { text: 'Espécie', style: 'tableHeader' }, { text: 'Sexo', style: 'tableHeader' }, { text: 'Idade', style: 'tableHeader' }, { text: 'Peso', style: 'tableHeader' }, { text: 'Vacinado', style: 'tableHeader' }, { text: 'Usa Med?', style: 'tableHeader' }, { text: 'Medicamento', style: 'tableHeader' }]
            ];
            
            pets.forEach((pet, index) => {
                petsTableBody.push([
                    { text: String(index + 1), style: 'tableCell' },
                    { text: pet.nome, style: 'tableCell' },
                    { text: pet.especie === 'gato' ? 'Gato' : 'Cachorro', style: 'tableCell' },
                    { text: pet.sexo === 'macho' ? 'Macho' : 'Fêmea', style: 'tableCell' },
                    { text: pet.idade || '-', style: 'tableCell' },
                    { text: pet.peso || '-', style: 'tableCell' },
                    { text: pet.vacinado ? 'Sim' : 'Não', style: 'tableCell' },
                    { text: pet.medicamento ? 'Sim' : 'Não', style: 'tableCell' },
                    { text: pet.medicamento || '-', style: 'tableCell' }
                ]);
            });
            
            content.push({
                table: {
                    widths: [25, '*', '*', '*', '*', '*', '*', '*', '*'],
                    body: petsTableBody
                },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => '#cccccc',
                    vLineColor: () => '#cccccc'
                },
                margin: [0, 0, 0, 20]
            });
        }
        
        // Rodapé
        content.push({
            text: 'Guarde este comprovante para apresentação no dia do mutirão.',
            style: 'footer',
            alignment: 'center',
            margin: [0, 20, 0, 0]
        });
        
        content.push({
            text: `Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
            style: 'footerSmall',
            alignment: 'center'
        });
        
        const logoPath = path.join(__dirname, '..', 'static', 'css', 'imagem', 'ong.jpg');
        const emitDate = new Date().toLocaleDateString('pt-BR');
        const emitTime = new Date().toLocaleTimeString('pt-BR');
        
        const docDefinition = {
            content: content,
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [40, 80, 40, 50],
            header: {
                margin: [20, 10, 20, 0],
                table: {
                    widths: [70, '*', 140],
                    body: [
                        [{
                            image: logoPath,
                            width: 60,
                            alignment: 'center',
                            margin: [0, 2, 0, 2]
                        }, {
                            stack: [{
                                text: 'ONG Amor Animal Marilia',
                                style: 'headerTitle',
                                alignment: 'center'
                            }, {
                                text: 'Comprovante de Inscrição - Mutirão de Castração',
                                style: 'headerSubtitle',
                                alignment: 'center'
                            }, {
                                text: `Emitido em: ${emitDate} às ${emitTime}`,
                                style: 'headerDate',
                                alignment: 'center'
                            }],
                            margin: [0, 5, 0, 0]
                        }, {
                            text: 'Rua Alcides Caliman, 701\nJd. Bandeirantes\nMarília - SP\nhttps://amoranimal.ong.br',
                            style: 'addressHeader',
                            alignment: 'right',
                            margin: [0, 5, 5, 0]
                        }]
                    ]
                },
                layout: {
                    hLineWidth: function() { return 0.5; },
                    vLineWidth: function() { return 0.5; },
                    hLineColor: function() { return '#cccccc'; },
                    vLineColor: function() { return '#cccccc'; }
                }
            },
            styles: {
                header: {
                    fontSize: 16,
                    bold: true,
                    color: '#333333'
                },
                ticket: {
                    fontSize: 24,
                    bold: true,
                    color: '#cc0000',
                    background: '#f5f5f5'
                },
                subHeader: {
                    fontSize: 12,
                    bold: true,
                    color: '#0066CC',
                    margin: [0, 10, 0, 5]
                },
                label: {
                    fontSize: 10,
                    bold: true,
                    color: '#666666'
                },
                value: {
                    fontSize: 10,
                    color: '#333333'
                },
                tableHeader: {
                    fontSize: 9,
                    bold: true,
                    color: '#ffffff',
                    fillColor: '#0066CC'
                },
                tableCell: {
                    fontSize: 9,
                    color: '#333333'
                },
                footer: {
                    fontSize: 10,
                    italics: true,
                    color: '#666666'
                },
                footerSmall: {
                    fontSize: 8,
                    color: '#999999'
                },
                addressHeader: {
                    fontSize: 8,
                    color: '#555555'
                },
                headerTitle: {
                    fontSize: 12,
                    bold: true,
                    color: '#333333',
                    margin: [0, 0, 0, 2]
                },
                headerSubtitle: {
                    fontSize: 10,
                    bold: true,
                    color: '#333333',
                    margin: [0, 0, 0, 2]
                },
                headerDate: {
                    fontSize: 8,
                    color: '#555555'
                }
            }
        };
        
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=comprovante_mutirao_${inscricao.ticket}.pdf`);
        
        pdfDoc.pipe(res);
        pdfDoc.end();
        
    } catch (error) {
        console.error('[castracaoRoutes GET /mutirao-inscricao/comprovante] Erro:', error);
        req.flash('error', 'Erro ao gerar comprovante.');
        res.redirect('/castracao/calendario-mutirao');
    }
});

// GET /castracao/pets-rua - Renderiza o formulário para pets de rua
router.get('/pets-rua', async (req, res) => {
    try {
        const clinicas = await executeQuery("SELECT nome FROM clinicas ORDER BY nome;");
        const formData = req.flash('formData')[0] || {};

        if (req.query.new_clinic_name) {
            formData.clinica = req.query.new_clinic_name;
        }
        
        res.render('castracao_rua', { 
            clinicas: clinicas, 
            error: req.flash('error'),
            success: req.flash('success'),
            formData: formData
        });
    } catch (error) {
        console.error("[castracaoRoutes GET /pets-rua] Erro ao buscar clínicas:", error.message);
        res.status(500).render('castracao_rua', { 
            error: 'Não foi possível carregar a lista de clínicas. Tente novamente mais tarde.',
            clinicas: []
        });
    }
});

// GET /castracao/baixo-custo - Renderiza o formulário para castração de baixo custo
router.get('/baixo-custo', async (req, res) => {
    try {
        const clinicas = await executeQuery("SELECT nome FROM clinicas ORDER BY nome;");
        const formData = req.flash('formData')[0] || {};

        if (req.query.new_clinic_name) {
            formData.clinica = req.query.new_clinic_name;
        }
        
        res.render('castracao_baixo_custo', { 
            clinicas: clinicas, 
            error: req.flash('error'),
            success: req.flash('success'),
            formData: formData
        });
    } catch (error) {
        console.error("[castracaoRoutes GET /baixo-custo] Erro ao buscar clínicas:", error.message);
        res.status(500).render('castracao_baixo_custo', { 
            error: 'Não foi possível carregar a lista de clínicas. Tente novamente mais tarde.',
            clinicas: []
        });
    }
});

// GET /castracao/lista - Exibe os registros de castração (redireciona para dashboard)
router.get('/lista', async (req, res) => {
    try {
        res.redirect('/castracao');
    } catch (error) {
        console.error("[castracaoRoutes GET /lista] Erro ao redirecionar:", error.message);
        res.redirect('/');
    }
});
  
  // GET /castracao/form - Renderiza o formulário para novo registro de castração
  router.get('/form', async (req, res) => {
      try {
          // Busca a lista de clínicas do banco de dados para popular o dropdown no formulário.
        const clinicas = await executeQuery("SELECT id, nome, endereco FROM clinicas ORDER BY nome;");
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
  
  // POST /castracao/form - Processa o formulário de novo registro de castração (múltiplos pets)
  router.post('/form', async (req, res) => {
      const client = await pool.connect();
      const { 
          nome, contato, whatsapp, clinica, agenda, 
          tipo_castracao,
          pet_nome, pet_especie, pet_porte, pet_idade,
          locality
      } = req.body;

      const nomesPets = Array.isArray(pet_nome) ? pet_nome.filter(nome => nome && nome.trim() !== '') : [pet_nome];
      
      if (!nomesPets || nomesPets.length === 0) {
          req.flash('error', 'É necessário cadastrar pelo menos um pet.');
          return res.redirect('/castracao/baixo-custo');
      }

      try {
          const tipo = tipo_castracao || 'baixo_custo';
          const ticketBase = await generateCastracaoTicket(client, tipo);
          const baseNumber = parseInt(ticketBase.slice(1), 10);
          const prefixo = ticketBase.charAt(0);
          
          for (let i = 0; i < nomesPets.length; i++) {
              const petNomeValido = nomesPets[i];
              const arrayIndex = Array.isArray(pet_nome) ? pet_nome.indexOf(petNomeValido) : 0;
              
              await insert_castracao(
                  prefixo + String(baseNumber + i).padStart(4, '0'),
                  nome,
                  contato,
                  whatsapp,
                  Array.isArray(pet_idade) ? pet_idade[arrayIndex] : pet_idade,
                  Array.isArray(pet_especie) ? pet_especie[arrayIndex] : pet_especie,
                  Array.isArray(pet_porte) ? pet_porte[arrayIndex] : pet_porte,
                  clinica,
                  agenda,
                  tipo,
                  petNomeValido,
                  locality
              );
          }
          
          console.log('[castracaoRoutes POST /form] Dados de castração inseridos:', nomesPets.length, 'pets');
          req.flash('success', `Agendamento de castração solicitado com sucesso! ${nomesPets.length} pet(s) inscrito(s).`);
          res.redirect('/castracao/sucesso/' + ticketBase);

      } catch (error) {
          console.error("[castracaoRoutes POST /form] Erro ao processar formulário de castração:", error);
          
          let errorMessage = 'Erro ao salvar os dados de castração. Tente novamente.';
          if (error.code === '23505') {
              errorMessage = 'Erro: O número do ticket já existe. Tente enviar o formulário novamente.';
          }
          req.flash('error', errorMessage);
          req.flash('formData', req.body);
          res.redirect('/castracao/baixo-custo');
      } finally {
          client.release();
      }
  });
  
  // POST /castracao/delete/:id - Deleta um registro de castração
  router.post('/delete/:id', isAdmin, async (req, res) => {
      const { id } = req.params;
  
      try {
          const deleteSql = `DELETE FROM castracao WHERE id = $1`;
          const result = await pool.query(deleteSql, [id]);
  
          if (result.rowCount === 0) {
              console.warn(`[castracaoRoutes DELETE] Nenhum registro encontrado na tabela 'castracao' com ID: ${id} para deletar.`);
          } else {
              console.log(`[castracaoRoutes DELETE] Registro de castração com ID: ${id} deletado.`);
          }
  
          req.flash('success', 'Registro de castração removido com sucesso.');
          res.redirect('/castracao/lista');
  
      } catch (error) {
          console.error(`[castracaoRoutes DELETE /delete/:id] Erro ao deletar registro de castração com ID: ${id}:`, error);
          res.status(500).render('error', { error: 'Erro ao deletar o agendamento de castração. Tente novamente.' });
      }
  });
   
// POST /castracao/updateStatus/:id - Updates the status of a castracao entry
  router.post('/updateStatus/:id',  async (req, res) => {
      const { id } = req.params;

      try {
          // Valida o ID para evitar passar undefined/null ao pool.query
          const idNum = parseInt(id, 10);
          if (!Number.isInteger(idNum) || idNum <= 0) {
              console.warn(`[castracaoRoutes UPDATE] ID inválido recebido: ${id}`);
              req.flash('error', 'ID inválido para atualização do status.');
              return res.redirect('/home');
          }

          // Atualiza apenas o status e grava o timestamp de atendimento em 'atendido_em'.
          const updateSql = `UPDATE castracao SET status = 'ATENDIDO', atendido_em = CURRENT_TIMESTAMP WHERE id = $1`;
          const result = await pool.query(updateSql, [idNum]);

          if (result.rowCount === 0) {
              console.warn(`[castracaoRoutes UPDATE] Nenhum registro encontrado na tabela 'castracao' com ID: ${id} para atualizar o status.`);
              req.flash('error', `Nenhum registro encontrado na tabela 'castracao' com ID: ${id} para atualizar o status.`);
          } else {
              console.log(`[castracaoRoutes UPDATE] Registro de castracao com ID: ${id} teve o status atualizado para ATENDIDO.`);
              req.flash('success', 'Status do agendamento de castração atualizado para ATENDIDO com sucesso.');
          }
          res.redirect('/home');
      } catch (error) {
          console.error(`[castracaoRoutes UPDATE /updateStatus/:id] Erro ao atualizar o status do registro de castracao com ID: ${id}:`, error && error.stack ? error.stack : error);
          // Mostra mensagem amigável ao usuário, e mantém o log com stack trace para debugging
          req.flash('error', 'Erro ao atualizar o status do agendamento de castração. Tente novamente.');
          res.redirect('/home');
      }
    });
      

  
    

  // Rota generica
   router.get('/:id', async (req, res) => {
   const id = req.params.id;
   const tabela = 'castracao';
   try {
        const query = "SELECT * FROM castracao WHERE id = $1 LIMIT 1";
        const [item] = await executeQuery(query, [id]);

        if (!item) {
            req.flash('error', 'Registro de castração não encontrado.');
            return res.redirect('/castracao/lista');
        }

        res.render('edit', { model: item, tabela: tabela, id: id });
   } catch (error) {
        console.error(`[castracaoRoutes GET /:id] Error fetching castracao detail for id ${id}:`, error);
        res.status(500).render('error', { error: 'Não foi possível carregar os detalhes do registro de castração.' });
   }
   });
 

 
 // GET /castracao/calendario-mutirao/relatorio/:id - Gera relatório PDF de tutores e pets de um mutirão (admin)
router.get('/calendario-mutirao/relatorio/:id', isAdmin, async (req, res) => {
    const mutiraoId = req.params.id;
    const PdfPrinter = require('pdfmake');
    const path = require('path');
    const fs = require('fs');
    
    try {
        // Buscar dados do mutirão
        const mutiraoResult = await executeQuery('SELECT * FROM calendario_mutirao WHERE id = $1', [mutiraoId]);
        if (mutiraoResult.length === 0) {
            req.flash('error', 'Mutirão não encontrado.');
            return res.redirect('/castracao/calendario-mutirao');
        }
        
        const mutirao = mutiraoResult[0];
        
        // Buscar inscrições com pets
        const inscricoesResult = await executeQuery(`
            SELECT 
                mi.id as inscricao_id,
                mi.nome_responsavel,
                mi.localidade,
                mi.contato,
                mi.created_at as data_inscricao,
                TO_CHAR(mi.created_at, 'DD/MM/YYYY HH24:MI:SS') AS data_formatada,
                mp.id as pet_id,
                mp.nome as pet_nome,
                mp.especie,
                mp.sexo,
                mp.idade,
                mp.peso,
                mp.vacinado,
                mp.medicamento
            FROM mutirao_inscricao mi
            LEFT JOIN mutirao_pet mp ON mi.id = mp.mutirao_inscricao_id
            WHERE mi.calendario_mutirao_id = $1
            ORDER BY mi.nome_responsavel, mp.nome
        `, [mutiraoId]);
        
        if (inscricoesResult.length === 0) {
            req.flash('error', 'Nenhuma inscrição encontrada para este mutirão.');
            return res.redirect('/castracao/calendario-mutirao');
        }
        
        // Função para sanitizar texto para o PDF (igual ao relatorioRoutes)
        function sanitizeTextForPdf(text) {
            if (text === null || text === undefined) {
                return '';
            }
            let str = String(text);
            str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
            str = str.replace(/^\s+|\s+$/g, '').replace(/ +/g, ' ');
            return str;
        }
        
        // Configuração do PDF (igual ao relatorioRoutes)
        const fontDescriptors = {
            Roboto: {
                normal: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Regular.ttf'),
                bold: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Medium.ttf'),
                italics: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Italic.ttf'),
                bolditalics: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-MediumItalic.ttf')
            }
        };
        
        Object.values(fontDescriptors.Roboto).forEach(fontPath => {
            if (!fs.existsSync(fontPath)) {
                console.warn(`[PDF Font Warning] Arquivo de fonte não encontrado: ${fontPath}.`);
            }
        });
        
        const printer = new PdfPrinter(fontDescriptors);
        const time = new Date().toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const content = [];
        
        // Informações do mutirão no formato do relatorioRoutes
        content.push({
            text: sanitizeTextForPdf(`Mutirão: ${mutirao.clinica} - ${new Date(mutirao.data_evento).toLocaleDateString('pt-BR')}`),
            style: 'subHeader',
            alignment: 'center',
            margin: [0, 0, 0, 10]
        });
        
        // Cabeçalhos da tabela (formato relatorioRoutes)
        const tableHeaders = ['Responsável', 'Localidade', 'Contato', 'Data Inscrição', 'Pet', 'Espécie', 'Sexo', 'Idade', 'Peso', 'Vacinado', 'Medicamento'];
        const columnWidths = ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', '*'];
        
        // Adicionar cabeçalhos da tabela
        content.push({
            table: {
                widths: columnWidths,
                body: [
                    tableHeaders.map(header => ({
                        text: sanitizeTextForPdf(header),
                        style: 'tableHeader',
                        alignment: 'center'
                    }))
                ]
            },
            layout: {
                hLineWidth: () => 0.8,
                vLineWidth: () => 0.8,
                hLineColor: () => '#0066CC',
                vLineColor: () => '#0066CC',
                paddingLeft: () => 4,
                paddingRight: () => 4,
                paddingTop: () => 3,
                paddingBottom: () => 3,
                fillColor: () => '#E8F4FD'
            }
        });
        
        // Dados da tabela
        const tableBody = [];
        
        // Agrupar dados por inscrição/pet
        inscricoesResult.forEach(row => {
            if (row.pet_id) { // Apenas linhas com pet
                const rowData = [
                    sanitizeTextForPdf(row.nome_responsavel),
                    sanitizeTextForPdf(row.localidade || 'Não informada'),
                    sanitizeTextForPdf(row.contato),
                    sanitizeTextForPdf(row.data_formatada),
                    sanitizeTextForPdf(row.pet_nome),
                    sanitizeTextForPdf(row.especie),
                    sanitizeTextForPdf(row.sexo),
                    sanitizeTextForPdf(row.idade || 'Não informada'),
                    sanitizeTextForPdf(row.peso || 'Não informado'),
                    sanitizeTextForPdf(row.vacinado ? 'Sim' : 'Não'),
                    sanitizeTextForPdf(row.medicamento || 'Nenhum')
                ];
                
                tableBody.push(rowData.map(cell => ({
                    text: cell,
                    style: 'tableCell'
                })));
            }
        });
        
        // Adicionar tabela com dados
        if (tableBody.length > 0) {
            content.push({
                table: {
                    headerRows: 0,
                    widths: columnWidths,
                    body: tableBody
                },
                layout: {
                    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0.8 : 0.3,
                    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 0.8 : 0.3,
                    hLineColor: (i, node) => (i === 0 || i === node.table.body.length) ? '#0066CC' : '#E0E0E0',
                    vLineColor: (i, node) => (i === 0 || i === node.table.widths.length) ? '#0066CC' : '#E0E0E0',
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 3,
                    paddingBottom: () => 3,
                    fillColor: (rowIndex, node) => {
                        return rowIndex % 2 === 0 ? '#F8F8F8' : '#FFFFFF';
                    }
                }
            });
        }
        
        // Resumo final
        const totalPets = tableBody.length;
        const responsaveisUnicos = [...new Set(inscricoesResult.filter(row => row.pet_id).map(row => row.nome_responsavel))].length;
        
        content.push({
            text: ' ',
            margin: [0, 10]
        });
        
        content.push({
            text: sanitizeTextForPdf(`Total: ${responsaveisUnicos} responsável(is) com ${totalPets} pet(s) inscritos`),
            style: 'subHeader',
            alignment: 'center'
        });
        
        // Logo do sistema (caminho igual ao relatorioRoutes)
        const logoPath = path.join(__dirname, '..', 'static', 'css', 'imagem', 'ong.jpg');
        
        const docDefinition = {
            header: (currentPage, pageCount, pageSize) => {
                return {
                    margin: [20, 10, 20, 0],
                    table: {
                        widths: [70, '*', 140],
                        body: [
                            [{
                                image: logoPath,
                                width: 60,
                                alignment: 'center',
                                margin: [0, 2, 0, 2]
                            }, {
                                stack: [{
                                    text: 'ONG Amor Animal Marilia',
                                    style: 'headerTitle',
                                    alignment: 'center'
                                }, {
                                    text: sanitizeTextForPdf(`Relatório: Mutirão de Castração`),
                                    style: 'headerSubtitle',
                                    alignment: 'center'
                                }, {
                                    text: sanitizeTextForPdf(`Gerado em: ${time}`),
                                    style: 'headerDate',
                                    alignment: 'center'
                                }],
                                margin: [0, 5, 0, 0]
                            }, {
                                text: 'Rua Alcides Caliman, 701\nJd. Bandeirantes\nMarília - SP\nhttps://amoranimal.ong.br',
                                style: 'addressHeader',
                                alignment: 'right',
                                margin: [0, 5, 5, 0]
                            }]
                        ]
                    },
                    layout: {
                        hLineWidth: function(i, node) {
                            return 0.5;
                        },
                        vLineWidth: function(i, node) {
                            return 0.5;
                        },
                        hLineColor: function(i, node) {
                            return '#cccccc';
                        },
                        vLineColor: function(i, node) {
                            return '#cccccc';
                        }
                    }
                };
            },
            content: content,
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [20, 80, 20, 50],
            styles: {
                addressHeader: {
                    fontSize: 8,
                    color: '#555555'
                },
                headerTitle: {
                    fontSize: 12,
                    bold: true,
                    color: '#333333',
                    margin: [0, 0, 0, 2]
                },
                headerSubtitle: {
                    fontSize: 10,
                    bold: true,
                    color: '#333333',
                    margin: [0, 0, 0, 2]
                },
                headerDate: {
                    fontSize: 8,
                    color: '#555555'
                },
                mainHeader: {
                    fontSize: 16,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, 5],
                    color: '#333333'
                },
                subHeader: {
                    fontSize: 10,
                    alignment: 'center',
                    margin: [0, 0, 0, 5],
                    bold: true,
                    color: '#0066CC'
                },
                yearMonthHeader: {
                    fontSize: 6,
                    bold: true,
                    margin: [0, 10, 0, 5],
                    color: '#0066CC'
                },
                tableHeader: {
                    bold: true,
                    fontSize: 7,
                    fillColor: '#E8F4FD',
                    color: '#0066CC',
                    alignment: 'center'
                },
                tableCell: {
                    fontSize: 6,
                    alignment: 'left'
                },
                footerStyle: {
                    fontSize: 8,
                    alignment: 'center',
                    margin: [0, 20, 0, 0]
                }
            },
            defaultStyle: {
                font: 'Roboto'
            },
            footer: (currentPage, pageCount) => ({
                text: sanitizeTextForPdf(`Página ${currentPage.toString()} de ${pageCount.toString()}`),
                style: 'footerStyle'
            })
        };
        
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=relatorio_mutirao_${mutiraoId}_${Date.now()}.pdf`);
        
        pdfDoc.pipe(res);
        pdfDoc.end();
        
    } catch (error) {
        console.error(`[castracaoRoutes GET /calendario-mutirao/relatorio/${mutiraoId}] Erro:`, error);
        req.flash('error', 'Erro ao gerar relatório: ' + error.message);
        res.redirect('/castracao/calendario-mutirao');
    }
});

// DELETE /castracao/calendario-mutirao/delete/:id - Exclui um mutirão (admin)
router.post('/calendario-mutirao/delete/:id', isAdmin, async (req, res) => {
    const client = await pool.connect();
    const mutiraoId = req.params.id;
    
    try {
        await client.query('BEGIN');
        
        // Verificar se o mutirão existe
        const mutiraoResult = await client.query('SELECT * FROM calendario_mutirao WHERE id = $1', [mutiraoId]);
        if (mutiraoResult.rowCount === 0) {
            await client.query('ROLLBACK');
            req.flash('error', 'Mutirão não encontrado.');
            return res.redirect('/castracao/calendario-mutirao');
        }
        
        // Excluir inscrições relacionadas (CASCADE delete deve cuidar disso, mas vamos garantir)
        await client.query('DELETE FROM mutirao_inscricao WHERE calendario_mutirao_id = $1', [mutiraoId]);
        
        // Excluir o mutirão
        await client.query('DELETE FROM calendario_mutirao WHERE id = $1', [mutiraoId]);
        
        await client.query('COMMIT');
        
        req.flash('success', 'Mutirão excluído com sucesso, incluindo todas as inscrições relacionadas.');
        res.redirect('/castracao/calendario-mutirao');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[castracaoRoutes DELETE /calendario-mutirao/delete/${mutiraoId}] Erro:`, error);
        req.flash('error', 'Erro ao excluir mutirão: ' + error.message);
        res.redirect('/castracao/calendario-mutirao');
    } finally {
        client.release();
    }
});

// DELETE /castracao/mutirao/delete/:id - Exclui uma inscrição de mutirão (admin)
router.post('/mutirao/delete/:id', isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const deleteSql = `DELETE FROM mutirao_castracao WHERE id = $1`;
        const result = await pool.query(deleteSql, [id]);

        if (result.rowCount === 0) {
            console.warn(`[castracaoRoutes DELETE] Nenhum registro encontrado na tabela 'mutirao_castracao' com ID: ${id} para deletar.`);
            req.flash('error', 'Inscrição não encontrada.');
        } else {
            console.log(`[castracaoRoutes DELETE] Registro de mutirão castração com ID: ${id} deletado.`);
            req.flash('success', 'Inscrição de mutirão removida com sucesso.');
        }
        res.redirect('/castracao/lista');

    } catch (error) {
        console.error(`[castracaoRoutes DELETE /mutirao/delete/:id] Erro ao deletar inscrição de mutirão com ID: ${id}:`, error);
        res.status(500).render('error', { error: 'Erro ao deletar a inscrição de mutirão. Tente novamente.' });
    }
});

module.exports = router;
 