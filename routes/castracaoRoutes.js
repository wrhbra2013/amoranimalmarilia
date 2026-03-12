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

// Middleware local para carregar listas e configuração de clínica padrão em res.locals
router.use(async (req, res, next) => {
    try {
        // carregar clínicas (pode falhar se DB indisponível)
        let clinicas = [];
        try {
            clinicas = await executeQuery("SELECT id, nome, endereco FROM clinicas ORDER BY nome;");
        } catch (e) {
            clinicas = [];
        }
        res.locals.clinicas = clinicas;

        // carregar configuração de clínica padrão de arquivo
        const configPath = path.join(__dirname, '..', 'config', 'castracao_settings.json');
        try {
            const cfgRaw = await fs.readFile(configPath, 'utf8');
            const cfg = JSON.parse(cfgRaw);
            res.locals.defaultClinica = cfg.defaultClinica || '';
            res.locals.defaultClinicaEndereco = cfg.defaultClinicaEndereco || '';
        } catch (e) {
            // se não houver config, tentar derivar do primeiro registro de clinicas
            res.locals.defaultClinica = '';
            res.locals.defaultClinicaEndereco = '';
        }

        // se houver clinicas e defaultClinica vazio, tenta preencher endereco pela busca
        if ((!res.locals.defaultClinicaEndereco || res.locals.defaultClinicaEndereco === '') && res.locals.defaultClinica && res.locals.clinicas && res.locals.clinicas.length) {
            const found = res.locals.clinicas.find(c => c.nome === res.locals.defaultClinica);
            if (found) res.locals.defaultClinicaEndereco = found.endereco || '';
        }

        // expor usuário na view
        res.locals.user = req.session && req.session.user;
        next();
    } catch (err) {
        console.warn('[castracaoRoutes middleware] erro ao carregar dados locais:', err.message);
        res.locals.clinicas = [];
        res.locals.defaultClinica = '';
        res.locals.user = req.session && req.session.user;
        next();
    }
});

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
                            text: 'Rua Pascoal Eugenio Brasini, 701\nJd. Eldorado\nMarília - SP\nhttps://amoranimal.ong.br',
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
                    fontSize: 8,
                    bold: true,
                    color: '#ffffff',
                    fillColor: '#0066CC'
                },
                tableCell: {
                    fontSize: 8,
                    color: '#333333'
                },
                footer: {
                    fontSize: 9,
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

// Contador em memória para tickets (evita problemas de concorrência)
const ticketCounters = {
    mutirao: 0,
    pets_rua: 0,
    baixo_custo: 0
};

// Função para gerar ticket sequencial com prefixo por tipo usando transação atômica
async function generateCastracaoTicket(client, tipo = 'baixo_custo') {
    const prefixo = tipo === 'mutirao' ? 'M' : (tipo === 'pets_rua' ? 'R' : 'B');
    
    try {
        // Usa função do banco para gerar ticket único de forma atômica
        const result = await client.query(`
            WITH max_ticket AS (
                SELECT MAX(
                    CASE 
                        WHEN ticket ~ $1 THEN CAST(SUBSTRING(ticket FROM 2 FOR 4) AS INTEGER)
                        ELSE 0
                    END
                ) as max_num
                FROM castracao
                WHERE ticket LIKE $2
            )
            SELECT $3 || LPAD(COALESCE(max_num, 0) + 1, 4, '0') as new_ticket
            FROM max_ticket
        `, [`^[${prefixo}][0-9]{4}$`, prefixo + '%', prefixo]);
        
        if (result.rows.length > 0) {
            const newTicket = result.rows[0].new_ticket;
            console.log(`[generateCastracaoTicket] Ticket gerado: ${newTicket}`);
            return newTicket;
        }
    } catch (err) {
        console.error('[generateCastracaoTicket] Erro na query:', err);
    }
    
    // Fallback: gera ticket simples
    const fallbackTicket = prefixo + '0001';
    console.log(`[generateCastracaoTicket] Ticket fallback: ${fallbackTicket}`);
    return fallbackTicket;
}
 
// GET /castracao - Exibe o dashboard de castração
router.get('/', async (req, res) => {
    try {
        // Buscar lista de clínicas para o select do administrador
        let clinicas = [];
        try {
            clinicas = await executeQuery("SELECT id, nome, endereco FROM clinicas ORDER BY nome;");
        } catch (e) {
            console.warn('[castracaoRoutes GET /] Não foi possível carregar clínicas:', e.message);
            clinicas = [];
        }

        // Carregar clínica padrão (arquivo de configuração simples)
        const configPath = path.join(__dirname, '..', 'config', 'castracao_settings.json');
        let defaultClinica = '';
        let defaultClinicaEndereco = '';
        try {
            const cfgRaw = await fs.readFile(configPath, 'utf8');
            const cfg = JSON.parse(cfgRaw);
            defaultClinica = cfg.defaultClinica || '';
            defaultClinicaEndereco = cfg.defaultClinicaEndereco || '';
        } catch (e) {
            // arquivo pode não existir — ignora
            defaultClinica = '';
            defaultClinicaEndereco = '';
        }

        res.render('castracao_dashboard', { clinicas: clinicas, defaultClinica: defaultClinica, defaultClinicaEndereco: defaultClinicaEndereco, user: req.session && req.session.user });
    } catch (error) {
        console.error("[castracaoRoutes GET /] Erro ao renderizar dashboard:", error.message);
        res.status(500).render('error', { error: error.message || 'Não foi possível carregar o dashboard de castração.' });
    }
});


// POST /castracao/admin/default-clinica - salva a clínica padrão usada para baixo custo/pets-rua (admin)
router.post('/admin/default-clinica', isAdmin, async (req, res) => {
    try {
        const { defaultClinica } = req.body;
        // tentar obter endereco da tabela de clinicas
        let endereco = '';
        try {
            const rows = await executeQuery('SELECT endereco FROM clinicas WHERE nome = $1 LIMIT 1', [defaultClinica]);
            if (rows && rows.length) endereco = rows[0].endereco || '';
        } catch (e) {
            // fallback: tentar encontrar em res.locals.clinicas
            const found = (res.locals && res.locals.clinicas) ? res.locals.clinicas.find(c => c.nome === defaultClinica) : null;
            if (found) endereco = found.endereco || '';
        }

        const configDir = path.join(__dirname, '..', 'config');
        const configPath = path.join(configDir, 'castracao_settings.json');
        try { await fs.mkdir(configDir, { recursive: true }); } catch (e) {}
        const cfg = { defaultClinica: defaultClinica || '', defaultClinicaEndereco: endereco || '' };
        await fs.writeFile(configPath, JSON.stringify(cfg, null, 2), 'utf8');
        req.flash('success', 'Clínica padrão atualizada com sucesso.');
        res.redirect('/castracao');
    } catch (error) {
        console.error('[castracaoRoutes POST /admin/default-clinica] Erro:', error);
        req.flash('error', 'Não foi possível salvar a clínica padrão.');
        res.redirect('/castracao');
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
        
        // Salva cada animal na tabela castracao com tipo='mutirao'
        const numVagas = parseInt(vagas_solicitadas || 1, 10);
        
        // Se tiver animais_json, usa eles, senão cria 1 registro
        let pets = [];
        if (animais && animais.length > 0) {
            pets = animais;
        } else {
            pets = [{ nome: 'Pet do mutirão', especie: 'não especificado' }];
        }

        // Primeiro ticket para redirecionar
        let firstTicket = '';

        // Gera um ticket único para cada pet
        for (let i = 0; i < pets.length; i++) {
            const pet = pets[i];
            // Cada pet gera um ticket sequencial único (incluindo o primeiro)
            const ticket = await generateCastracaoTicket(client, 'mutirao');
            
            // Determina endereço da clínica: prioridade para o mutirão (calendario), senão campo enviado no form
            const clinicaEndereco = mutirao && mutirao.endereco ? mutirao.endereco : (req.body.clinica_endereco || null);

            await insert_castracao(
                ticket,
                tutor_nome,
                tutor_contato,
                'sim',
                pet.idade || null,
                pet.especie || 'não especificado',
                pet.porte || 'não especificado',
                req.body.clinica || 'não especificada',
                clinicaEndereco,
                req.body.agenda || mutiraoRef,
                'mutirao',
                pet.nome || 'Pet do mutirão',
                null,
                pet.sexo || null
            );
            
            // Salva o primeiro ticket para redirecionar após o primeiro insert
            if (i === 0) {
                firstTicket = ticket;
            }
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
        const calendario = await executeQuery('SELECT * FROM calendario_mutirao ORDER BY data_evento DESC;');
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
        
        // Verificar se o mutirão já passou (data do evento)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataMutirao = new Date(mutirao.data_evento);
        dataMutirao.setHours(0, 0, 0, 0);
        
        if (dataMutirao <= hoje) {
            req.flash('error', 'Este mutirão já foi realizado. Inscrições encerradas.');
            return res.redirect('/castracao/calendario-mutirao');
        }
        
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
                req.flash('error', 'As vagas para este mutirão foram esgotadas.');
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

// Função para gerar ticket sequencial com prefixo M para mutirão
async function generateSequentialTicket(client) {
    const prefixo = 'M';
    
    // Busca o último ticket na tabela castracao
    const result = await client.query(`
        SELECT ticket FROM castracao 
        WHERE ticket LIKE $1
        ORDER BY ticket DESC LIMIT 1
    `, [prefixo + '%']);
    
    let nextNumber = 1;
    if (result.rows.length > 0) {
        const lastTicket = result.rows[0].ticket;
        const match = lastTicket.match(/^([A-Z])(\d{4})/);
        if (match) {
            const lastNumber = parseInt(match[2], 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
    }
    
    return prefixo + String(nextNumber).padStart(4, '0');
}

// POST /castracao/mutirao-inscricao - Processa inscrição
router.post('/mutirao-inscricao', async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const { 
            calendario_mutirao_id, 
            nome_responsavel, 
            contato,
            pets_json,
            cpf,
            cep,
            endereco,
            numero,
            complemento,
            bairro,
            cidade,
            estado
        } = req.body;
        
        // Debug: mostrar o que está chegando
        console.log('[DEBUG] POST dados recebidos:', {
            calendario_mutirao_id,
            nome_responsavel,
            cpf,
            contato,
            cep,
            pets_json
        });
        
        // Validar campos obrigatórios (limpando espaços)
        const contatoLimpo = contato ? String(contato).trim() : '';
        if (!calendario_mutirao_id || !nome_responsavel || !contatoLimpo || !cpf) {
            throw new Error('Dados obrigatórios não preenchidos.');
        }
        
        // Parsear pets do JSON
        let pets = [];
        try {
            if (pets_json) {
                pets = JSON.parse(pets_json);
            }
        } catch (e) {
            console.error('[DEBUG] Erro ao parsear pets_json:', e);
        }
        
        console.log('[DEBUG SERVER] pets parsed:', pets);
        
        if (!pets || pets.length === 0) {
            throw new Error('É necessário cadastrar pelo menos um pet para realizar a inscrição.');
        }
        
        // Gerar ticket sequencial para a inscrição (para referência)
        let ticketReferencia;
        let tentativa = 0;
        const maxTentativas = 10;
        
        while (tentativa < maxTentativas) {
            const prefixo = 'M';
            const result = await client.query(`
                SELECT ticket FROM mutirao_inscricao 
                WHERE ticket LIKE $1
                ORDER BY ticket DESC LIMIT 1
            `, [prefixo + '%']);
            
            let nextNumber = 1;
            if (result.rows.length > 0) {
                const lastTicket = result.rows[0].ticket;
                const match = lastTicket.match(/^M(\d{4})/);
                if (match) {
                    const lastNumber = parseInt(match[1], 10);
                    if (!isNaN(lastNumber)) {
                        nextNumber = lastNumber + 1;
                    }
                }
            }
            ticketReferencia = prefixo + String(nextNumber).padStart(4, '0');
            
            const checkTicket = await client.query('SELECT 1 FROM mutirao_inscricao WHERE ticket = $1', [ticketReferencia]);
            if (checkTicket.rows.length === 0) {
                break;
            }
            tentativa++;
        }
        
        if (tentativa >= maxTentativas) {
            throw new Error('Erro ao gerar ticket. Tente novamente.');
        }
        
        // Inserir inscrição do responsável com ticket de referência
        const inscricaoResult = await client.query(`
            INSERT INTO mutirao_inscricao (calendario_mutirao_id, ticket, nome_responsavel, cpf, contato, cep, endereco, numero, complemento, bairro, cidade, estado) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id
        `, [calendario_mutirao_id, ticketReferencia, nome_responsavel, cpf, contato, cep, endereco, numero, complemento, bairro, cidade, estado]);
        
        const inscricaoId = inscricaoResult.rows[0].id;
        
        // Usar o array de pets do JSON
        const petsSincronizados = pets.map(pet => ({
            nome: pet.nome || '',
            especie: pet.especie || '',
            sexo: pet.sexo || '',
            idade: pet.idade || '',
            peso: pet.peso || '',
            vacinado: pet.vacinado || false,
            medicamento: pet.medicamento || ''
        })).filter(p => p.nome && p.nome.trim() !== '');
        
        if (petsSincronizados.length === 0) {
            throw new Error('É necessário cadastrar pelo menos um pet válido para realizar a inscrição.');
        }
        
        // Verificar se há vagas disponíveis
        const mutiraoResult = await client.query('SELECT vagas, clinica, data_evento FROM calendario_mutirao WHERE id = $1', [calendario_mutirao_id]);
        const mutirao = mutiraoResult.rows[0];
        const clinicaMutirao = mutirao.clinica;
        const dataMutirao = new Date(mutirao.data_evento);
        
        // Verificar se o mutirão já passou (data do evento)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        dataMutirao.setHours(0, 0, 0, 0);
        
        if (dataMutirao <= hoje) {
            throw new Error('Este mutirão já foi realizado. Inscrições encerradas.');
        }
        
        if (mutirao.vagas !== 0) {
            const vagasUsadas = await client.query(`
                SELECT COUNT(mp.id) as total 
                FROM mutirao_inscricao mi 
                JOIN mutirao_pet mp ON mi.id = mp.mutirao_inscricao_id 
                WHERE mi.calendario_mutirao_id = $1
            `, [calendario_mutirao_id]);
            
            const vagasDisponiveis = mutirao.vagas - parseInt(vagasUsadas.rows[0].total);
            const totalPets = petsSincronizados.length;
            
            if (vagasDisponiveis < totalPets) {
                throw new Error(`Não há vagas suficientes. Disponíveis: ${vagasDisponiveis}, Solicitadas: ${totalPets}`);
            }
        }
        
        // Função auxiliar para gerar próximo ticket sequencial
        async function getNextPetTicket(client) {
            const prefixo = 'M';
            let tentativa = 0;
            const maxTentativas = 20;
            
            while (tentativa < maxTentativas) {
                // Busca o maior ticket atual (de qualquer tabela: mutirao_inscricao ou mutirao_pet)
                const result = await client.query(`
                    SELECT ticket FROM (
                        SELECT ticket FROM mutirao_inscricao WHERE ticket LIKE $1
                        UNION ALL
                        SELECT ticket FROM mutirao_pet WHERE ticket LIKE $1
                    ) AS all_tickets
                    ORDER BY ticket DESC LIMIT 1
                `, [prefixo + '%']);
                
                let nextNumber = 1;
                if (result.rows.length > 0) {
                    const lastTicket = result.rows[0].ticket;
                    const match = lastTicket.match(/^M(\d{4})/);
                    if (match) {
                        const lastNumber = parseInt(match[1], 10);
                        if (!isNaN(lastNumber)) {
                            nextNumber = lastNumber + 1;
                        }
                    }
                }
                const newTicket = prefixo + String(nextNumber).padStart(4, '0');
                
                // Verificar se ticket já existe em qualquer tabela
                const checkInscricao = await client.query('SELECT 1 FROM mutirao_inscricao WHERE ticket = $1', [newTicket]);
                const checkPet = await client.query('SELECT 1 FROM mutirao_pet WHERE ticket = $1', [newTicket]);
                
                if (checkInscricao.rows.length === 0 && checkPet.rows.length === 0) {
                    return newTicket;
                }
                tentativa++;
            }
            throw new Error('Erro ao gerar ticket único para pet.');
        }
        
        // Inserir pets com ticket único para cada pet (M0001, M0002, etc)
        for (const pet of petsSincronizados) {
            if (!pet.especie || !pet.sexo) {
                throw new Error('Pet ' + pet.nome + ' está com espécie ou sexo vazio.');
            }
            
            // Gerar ticket único sequencial para cada pet
            const petTicket = await getNextPetTicket(client);
            
            await client.query(`
                INSERT INTO mutirao_pet (
                    mutirao_inscricao_id, ticket, nome, especie, sexo, idade, peso, 
                    vacinado, medicamento
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                inscricaoId,
                petTicket,
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

// GET /castracao/mutirao-inscricao/comprovante/:id - Redireciona para o comprovante PDF
router.get('/mutirao-inscricao/comprovante/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // Primeiro tenta pegar o ticket do primeiro pet
        const petResult = await executeQuery('SELECT ticket FROM mutirao_pet WHERE mutirao_inscricao_id = $1 ORDER BY id LIMIT 1', [id]);
        
        let ticketRedirect;
        if (petResult && petResult.length > 0 && petResult[0].ticket) {
            ticketRedirect = petResult[0].ticket;
        } else {
            // Fallback para tickets antigos (sem ticket por pet)
            const result = await executeQuery('SELECT ticket FROM mutirao_inscricao WHERE id = $1', [id]);
            if (!result || result.length === 0) {
                req.flash('error', 'Inscrição não encontrada.');
                return res.redirect('/castracao/calendario-mutirao');
            }
            ticketRedirect = result[0].ticket;
        }
        
        res.redirect(`/castracao/mutirao/comprovante/${ticketRedirect}`);
    } catch (error) {
        console.error('[castracaoRoutes GET /mutirao-inscricao/comprovante] Erro:', error);
        req.flash('error', 'Erro ao gerar comprovante.');
        res.redirect('/castracao/calendario-mutirao');
    }
});

// GET /castracao/mutirao/comprovante/:ticket - Gera PDF do comprovante por ticket
router.get('/mutirao/comprovante/:ticket', async (req, res) => {
    const { ticket } = req.params;
    const PdfPrinter = require('pdfmake');
    const path = require('path');
    
    try {
        // Primeiro tenta encontrar pela ticket do pet (novo formato M0001-1)
        let inscricaoResult = await executeQuery(`
            SELECT mi.*, cm.data_evento, cm.clinica, cm.endereco as clinica_endereco, mp.ticket as pet_ticket, mp.nome as pet_nome, mp.especie as pet_especie, mp.sexo as pet_sexo, mp.idade as pet_idade, mp.peso as pet_peso
            FROM mutirao_pet mp
            JOIN mutirao_inscricao mi ON mp.mutirao_inscricao_id = mi.id
            JOIN calendario_mutirao cm ON mi.calendario_mutirao_id = cm.id
            WHERE mp.ticket = $1
        `, [ticket]);
        
        // Se não encontrar pelo ticket do pet, tenta pelo ticket da inscrição (formato antigo)
        if (!inscricaoResult || inscricaoResult.length === 0) {
            inscricaoResult = await executeQuery(`
                SELECT mi.*, cm.data_evento, cm.clinica, cm.endereco as clinica_endereco 
                FROM mutirao_inscricao mi
                JOIN calendario_mutirao cm ON mi.calendario_mutirao_id = cm.id
                WHERE mi.ticket = $1
            `, [ticket]);
        }
        
        if (!inscricaoResult || inscricaoResult.length === 0) {
            req.flash('error', 'Inscrição não encontrada.');
            return res.redirect('/castracao/calendario-mutirao');
        }
        
        const inscricao = inscricaoResult[0];
        
        // Se encontrou pelo ticket do pet, usa os dados do pet encontrado
        let pets;
        if (inscricao.pet_ticket) {
            pets = [{
                nome: inscricao.pet_nome,
                especie: inscricao.pet_especie,
                sexo: inscricao.pet_sexo,
                idade: inscricao.pet_idade,
                peso: inscricao.pet_peso
            }];
        } else {
            // Modo legacy: busca todos os pets da inscrição
            pets = await executeQuery(`
                SELECT * FROM mutirao_pet WHERE mutirao_inscricao_id = $1
            `, [inscricao.id]);
        }
        
        const pet = pets && pets.length > 0 ? pets[0] : {};
        const petInfo = pet.nome ? `Nome: ${pet.nome}, Espécie: ${pet.especie || '-'}, Sexo: ${pet.sexo || '-'}, Idade: ${pet.idade || '-'}, Peso: ${pet.peso || '-'}, Vacinado contra viroses: ( ) sim ( ) não, Vacinado contra raiva: ( ) sim ( ) não.` : 'Nenhum pet cadastrado.';
        
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
        
        // Ticket em destaque - usa ticket do pet se disponível, senão usa ticket da inscrição
        const ticketExibir = inscricao.pet_ticket || inscricao.ticket;
        content.push({
            text: `TICKET: ${ticketExibir}`,
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
        
        // Montar endereço completo
        var enderecoCompleto = '';
        if (inscricao.endereco) {
            enderecoCompleto += inscricao.endereco;
            if (inscricao.numero) enderecoCompleto += ', ' + inscricao.numero;
            if (inscricao.complemento) enderecoCompleto += ' - ' + inscricao.complemento;
        }
        
        var enderecoCep = '';
        if (inscricao.cep) {
            enderecoCep = inscricao.cep;
            if (inscricao.bairro) enderecoCep += ' - ' + inscricao.bairro;
            if (inscricao.cidade) enderecoCep += ' - ' + inscricao.cidade;
            if (inscricao.estado) enderecoCep += '/' + inscricao.estado;
        }
        
        content.push({
            table: {
                widths: ['*', '*'],
                body: [
                    [{ text: 'Nome:', style: 'label' }, { text: inscricao.nome_responsavel, style: 'value' }],
                    [{ text: 'CPF:', style: 'label' }, { text: inscricao.cpf || 'Não informado', style: 'value' }],
                    [{ text: 'Contato:', style: 'label' }, { text: inscricao.contato, style: 'value' }],
                    [{ text: 'CEP:', style: 'label' }, { text: enderecoCep || 'Não informado', style: 'value' }],
                    [{ text: 'Endereço:', style: 'label' }, { text: enderecoCompleto || 'Não informado', style: 'value' }]
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
                    [{ text: 'Clínica:', style: 'label' }, { text: inscricao.clinica, style: 'value' }]
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
        
        // ==================== PÁGINA 2: TERMO DE RESPONSABILIDADE ====================
        
        // Conteúdo do termo
        const termoContent = [
            { text: 'TERMO DE RESPONSABILIDADE', style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },
            { text: `Cadastro nº ${inscricao.ticket}`, style: 'value', margin: [0, 0, 0, 15] },
            { text: `Eu, ${inscricao.nome_responsavel}, CPF ${inscricao.cpf || 'Não informado'}, residente na ${inscricao.endereco || 'Não informado'}, nº ${inscricao.numero || 'S/N'}, bairro ${inscricao.bairro || 'Não informado'}, ${inscricao.cidade || ''}/${inscricao.estado || ''}, CEP ${inscricao.cep || 'Não informado'}, telefone ${inscricao.contato || 'Não informado'}.`, style: 'value', margin: [0, 0, 0, 15] },
            { text: '1. Por meio deste instrumento, confirmo ciência quanto às obrigações abaixo discriminadas, enquanto proprietário(a) do(s) animal(is) descrito(s) no ticket: ' + inscricao.ticket, style: 'value', margin: [0, 0, 0, 10] },
            { text: 'Nos últimos 10 dias apresentou alguma alteração de comportamento? (  ) sim (  ) não', style: 'value', margin: [0, 0, 0, 5] },
            { text: 'Está tendo vômito ou diarreia? (  ) sim (  ) não', style: 'value', margin: [0, 0, 0, 10] },
            { text: 'O referido animal será contemplado pelo Mutirão de Castração Gratuita da ONG Amor Animal, com cirurgia a ser realizada na Clínica Veterinária É o Bicho, pela Dra. Thais Carvalho Parra CRMV 38659.', style: 'value', margin: [0, 0, 0, 10] },
            { text: '2. Estar atento(a) e cumprir as orientações de pré e pós-operatório;', style: 'value', margin: [0, 3, 0, 3] },
            { text: '3. Acatar as orientações pré-operatórias fornecidas pela equipe veterinária;', style: 'value', margin: [0, 0, 0, 3] },
            { text: '4. Felinas fêmeas deverão retornar após 10 dias para retirada dos pontos;', style: 'value', margin: [0, 0, 0, 3] },
            { text: '5. É obrigatório o uso de colar elizabetano ou roupa cirúrgica;', style: 'value', margin: [0, 0, 0, 3] },
            { text: '6. Todos os animais serão medicados no ato da castração, não havendo necessidade de uso de medicação posterior, exceto em casos de dor. Nessa situação recomenda-se administrar 1 gota de dipirona por kg, a cada 8 horas, ou enquanto houver dor ou febre.', style: 'value', margin: [0, 0, 0, 10] },
            { text: 'Declaro estar ciente de que é direito da equipe médica veterinária suspender a realização do procedimento cirúrgico caso seja identificado algum fator impeditivo, e que a campanha não cobra qualquer tipo de intervenção extra.', style: 'value', margin: [0, 0, 0, 10] },
            { text: 'Declaro, ainda, estar ciente dos riscos inerentes ao processo de anestesia, bem como de eventuais incompatibilidades orgânicas do animal frente a medicamentos de uso comum.', style: 'value', margin: [0, 0, 0, 10] },
            { text: 'Declaro e autorizo o procedimento de marcação de orelha no meu gato(a), que se trata de marcação universal para controle populacional.', style: 'value', margin: [0, 0, 0, 10] },
            { text: 'Qualquer intercorrência que exija atendimento posterior, seja por falha no cumprimento das orientações fornecidas ou por fatores individuais do animal, será de inteira responsabilidade e custeio do(a) proprietário(a).', style: 'value', margin: [0, 0, 0, 10] },
            { text: 'Para mais informações, entre em contato: (14) 99815-1723 – ONG Amor Animal.', style: 'value', margin: [0, 0, 0, 10] },
            { text: 'Por expressão da verdade, firmo o presente.', style: 'value', margin: [0, 0, 0, 20] },
            { text: 'Marília, ' + (inscricao.data_evento ? new Date(inscricao.data_evento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })) + '.', style: 'value', alignment: 'center', margin: [0, 0, 0, 30] }
        ];
        
        content.push({
            stack: termoContent,
            margin: [20, 0, 20, 0],
            pageBreak: 'before'
        });
        
        // Assinaturas
        content.push({
            table: {
                widths: ['*', '*'],
                body: [
                    [
                        { text: '', border: [false, true, false, false], margin: [20, 20, 20, 0] },
                        { text: '', border: [false, true, false, false], margin: [20, 20, 20, 0] }
                    ],
                    [
                        { text: 'Médico Veterinário Responsável', alignment: 'center', margin: [0, 5, 0, 0], fontSize: 8 },
                        { text: 'Assinatura do Proprietário(a)', alignment: 'center', margin: [0, 5, 0, 0], fontSize: 8 }
                    ]
                ]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 20]
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
                            text: 'Rua Pascoal Eugenio Brasini, 701\nJd. Eldorado\nMarília - SP\nhttps://amoranimal.ong.br',
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
                    fontSize: 13,
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
                    fontSize: 10,
                    bold: true,
                    color: '#0066CC',
                    margin: [0, 10, 0, 5]
                },
                label: {
                    fontSize: 8,
                    bold: true,
                    color: '#666666'
                },
                value: {
                    fontSize: 10,
                    color: '#333333'
                },
                tableHeader: {
                    fontSize: 8,
                    bold: true,
                    color: '#ffffff',
                    fillColor: '#0066CC'
                },
                tableCell: {
                    fontSize: 8,
                    color: '#333333'
                },
                footer: {
                    fontSize: 8,
                    italics: true,
                    color: '#666666'
                },
                footerSmall: {
                    fontSize: 7,
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
                },
                value: {
                    fontSize: 8,
                    color: '#333333',
                    lineHeight: 1.3
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
        const clinicas = await executeQuery("SELECT id, nome, endereco FROM clinicas ORDER BY nome;");
        const formData = req.flash('formData')[0] || {};

        if (req.query.new_clinic_name) {
            formData.clinica = req.query.new_clinic_name;
        }

        // Load default clinic from config file
        const configPath = path.join(__dirname, '..', 'config', 'castracao_settings.json');
        let defaultClinicaConfig = '';
        let defaultClinicaEnderecoConfig = '';
        try {
            const cfgRaw = await fs.readFile(configPath, 'utf8');
            const cfg = JSON.parse(cfgRaw);
            defaultClinicaConfig = cfg.defaultClinica || '';
            defaultClinicaEnderecoConfig = cfg.defaultClinicaEndereco || '';
        } catch (e) {
            // arquivo pode não existir — ignora
            defaultClinicaConfig = '';
            defaultClinicaEnderecoConfig = '';
        }

        // Determine default clinic for non-admin users: prefer flashed value, else config default, else first clinic in list
        const defaultClinica = formData.clinica || defaultClinicaConfig || (clinicas && clinicas.length > 0 ? clinicas[0].nome : '');
        
        // Determine default clinic address: prefer flashed clinic, else config default, else first clinic in list
        let defaultClinicaEndereco = '';
        if (formData.clinica && clinicas) {
            const foundForm = clinicas.find(c => c.nome === formData.clinica);
            if (foundForm) defaultClinicaEndereco = foundForm.endereco || '';
        }
        if (!defaultClinicaEndereco && defaultClinicaConfig && clinicas) {
            const foundConfig = clinicas.find(c => c.nome === defaultClinicaConfig);
            if (foundConfig) defaultClinicaEndereco = foundConfig.endereco || '';
        }
        if (!defaultClinicaEndereco && clinicas && clinicas.length > 0) {
            defaultClinicaEndereco = clinicas[0].endereco || '';
        }

        res.render('castracao_rua', { 
            clinicas: clinicas, 
            error: req.flash('error'),
            success: req.flash('success'),
            formData: formData,
            defaultClinica: defaultClinica,
            defaultClinicaEndereco: defaultClinicaEndereco
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
        const clinicas = await executeQuery("SELECT id, nome, endereco FROM clinicas ORDER BY nome;");
        const formData = req.flash('formData')[0] || {};

        if (req.query.new_clinic_name) {
            formData.clinica = req.query.new_clinic_name;
        }

        // Load default clinic from config file
        const configPath = path.join(__dirname, '..', 'config', 'castracao_settings.json');
        let defaultClinicaConfig = '';
        let defaultClinicaEnderecoConfig = '';
        try {
            const cfgRaw = await fs.readFile(configPath, 'utf8');
            const cfg = JSON.parse(cfgRaw);
            defaultClinicaConfig = cfg.defaultClinica || '';
            defaultClinicaEnderecoConfig = cfg.defaultClinicaEndereco || '';
        } catch (e) {
            // arquivo pode não existir — ignora
            defaultClinicaConfig = '';
            defaultClinicaEnderecoConfig = '';
        }

        // Determine default clinic for non-admin users: prefer flashed value, else config default, else first clinic in list
        const defaultClinica = formData.clinica || defaultClinicaConfig || (clinicas && clinicas.length > 0 ? clinicas[0].nome : '');
        
        // Determine default clinic address: prefer flashed clinic, else config default, else first clinic in list
        let defaultClinicaEndereco = '';
        if (formData.clinica && clinicas) {
            const foundForm = clinicas.find(c => c.nome === formData.clinica);
            if (foundForm) defaultClinicaEndereco = foundForm.endereco || '';
        }
        if (!defaultClinicaEndereco && defaultClinicaConfig && clinicas) {
            const foundConfig = clinicas.find(c => c.nome === defaultClinicaConfig);
            if (foundConfig) defaultClinicaEndereco = foundConfig.endereco || '';
        }
        if (!defaultClinicaEndereco && clinicas && clinicas.length > 0) {
            defaultClinicaEndereco = clinicas[0].endereco || '';
        }

        res.render('castracao_baixo_custo', { 
            clinicas: clinicas, 
            error: req.flash('error'),
            success: req.flash('success'),
            formData: formData,
            defaultClinica: defaultClinica,
            defaultClinicaEndereco: defaultClinicaEndereco
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
           pet_nome, pet_especie, pet_porte, pet_idade, pet_sexo,
           locality
       } = req.body;

       // Normalizar pet_nome para array
       const petNomeArray = Array.isArray(pet_nome) ? pet_nome : [pet_nome];
       const petEspecieArray = Array.isArray(pet_especie) ? pet_especie : [pet_especie];
       const petPorteArray = Array.isArray(pet_porte) ? pet_porte : [pet_porte];
       const petIdadeArray = Array.isArray(pet_idade) ? pet_idade : [pet_idade];
       const petSexoArray = Array.isArray(pet_sexo) ? pet_sexo : [pet_sexo];
       
       // Contar pets válidos (com nome não vazio)
       let validPetCount = 0;
       for (let i = 0; i < petNomeArray.length; i++) {
           if (petNomeArray[i] && petNomeArray[i].trim() !== '') {
               validPetCount++;
           }
       }
       
       if (validPetCount === 0) {
           req.flash('error', 'É necessário cadastrar pelo menos um pet.');
           return res.redirect('/castracao/baixo-custo');
       }

       try {
           const tipo = tipo_castracao || 'baixo_custo';
           
           // Primeiro ticket para redirecionar
           let firstTicket = '';
           
           // Gera um ticket único para cada pet válido
           let validPetsProcessed = 0;
           for (let i = 0; i < petNomeArray.length; i++) {
               // Pular pets com nome vazio
               if (!petNomeArray[i] || petNomeArray[i].trim() === '') {
                   continue;
               }
               
               const petNomeValido = petNomeArray[i];
               
               // Cada pet gera um ticket sequencial único
               const ticket = await generateCastracaoTicket(client, tipo);
               
               if (validPetsProcessed === 0) firstTicket = ticket;
               
               await insert_castracao(
                   ticket,
                   nome,
                   contato,
                   whatsapp,
                   petIdadeArray[i],
                   petEspecieArray[i],
                   petPorteArray[i],
                   clinica,
                   req.body.clinica_endereco || null,
                   agenda,
                   tipo,
                   petNomeValido,
                   locality,
                   petSexoArray[i] || null
               );
               
               validPetsProcessed++;
           }
           
           console.log('[castracaoRoutes POST /form] Dados de castração inseridos:', validPetCount, 'pets');
           req.flash('success', `Agendamento de castração solicitado com sucesso! ${validPetCount} pet(s) inscrito(s).`);
           res.redirect('/castracao/sucesso/' + firstTicket);
 
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
          res.redirect('/home');
  
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

// POST /castracao/updateStatusAll - Updates status of all pending castracoes
  router.post('/updateStatusAll', async (req, res) => {
      try {
          // Update regular castracoes
          const updateCastracao = `UPDATE castracao SET status = 'ATENDIDO', atendido_em = CURRENT_TIMESTAMP WHERE status != 'ATENDIDO' OR status IS NULL`;
          const result1 = await pool.query(updateCastracao);
          
          // Update mutirao inscriptions
          const updateMutirao = `UPDATE mutirao_inscricao SET status = 'ATENDIDO' WHERE status != 'ATENDIDO' OR status IS NULL`;
          const result2 = await pool.query(updateMutirao);
          
          const total = result1.rowCount + result2.rowCount;
          console.log(`[castracaoRoutes UPDATE ALL] ${result1.rowCount} castrações e ${result2.rowCount} mutirões atualizados para ATENDIDO.`);
          req.flash('success', `${total} agendamento(s) marcado(s) como ATENDIDO com sucesso.`);
          res.redirect('/home');
      } catch (error) {
          console.error(`[castracaoRoutes UPDATE ALL] Erro ao atualizar todos os status:`, error);
          req.flash('error', 'Erro ao atualizar os status dos agendamentos.');
          res.redirect('/home');
      }
    });

// POST /castracao/mutirao/updateStatus/:id - Updates the status of a mutirao_inscricao entry
  router.post('/mutirao/updateStatus/:id',  async (req, res) => {
      const { id } = req.params;

      try {
          const idNum = parseInt(id, 10);
          if (!Number.isInteger(idNum) || idNum <= 0) {
              console.warn(`[castracaoRoutes UPDATE /mutirao/updateStatus] ID inválido recebido: ${id}`);
              req.flash('error', 'ID inválido para atualização do status.');
              return res.redirect('/home');
          }

          const updateSql = `UPDATE mutirao_inscricao SET status = 'ATENDIDO' WHERE id = $1`;
          const result = await pool.query(updateSql, [idNum]);

          if (result.rowCount === 0) {
              console.warn(`[castracaoRoutes UPDATE /mutirao/updateStatus] Nenhum registro encontrado na tabela 'mutirao_inscricao' com ID: ${id}`);
              req.flash('error', `Nenhum registro encontrado na tabela 'mutirao_inscricao' com ID: ${id}`);
          } else {
              console.log(`[castracaoRoutes UPDATE /mutirao/updateStatus] Registro de mutirão com ID: ${id} teve o status atualizado para ATENDIDO.`);
              req.flash('success', 'Status do agendamento de mutirão atualizado para ATENDIDO com sucesso.');
          }
          res.redirect('/home');
      } catch (error) {
          console.error(`[castracaoRoutes UPDATE /mutirao/updateStatus/:id] Erro ao atualizar o status do mutirão com ID: ${id}:`, error && error.stack ? error.stack : error);
          req.flash('error', 'Erro ao atualizar o status do agendamento de mutirão. Tente novamente.');
          res.redirect('/home');
      }
    });

// POST /castracao/arquivar/:id - Arquiva uma castracao
  router.post('/arquivar/:id', async (req, res) => {
      const { id } = req.params;
      try {
          const idNum = parseInt(id, 10);
          if (!Number.isInteger(idNum) || idNum <= 0) {
              req.flash('error', 'ID inválido.');
              return res.redirect('/home');
          }

          req.flash('success', 'Castração arquivada com sucesso.');
          res.redirect('/home');
      } catch (error) {
          console.error(`[castracaoRoutes] Erro ao arquivar:`, error);
          req.flash('error', 'Erro ao arquivar.');
          res.redirect('/home');
      }
    });

// POST /castracao/desarquivar/:id - Desarquiva uma castracao
  router.post('/desarquivar/:id', async (req, res) => {
      const { id } = req.params;
      try {
          const idNum = parseInt(id, 10);
          if (!Number.isInteger(idNum) || idNum <= 0) {
              req.flash('error', 'ID inválido.');
              return res.redirect('/home');
          }

          req.flash('success', 'Castração desarquivada com sucesso.');
          res.redirect('/home');
      } catch (error) {
          console.error(`[castracaoRoutes] Erro ao desarquivar:`, error);
          req.flash('error', 'Erro ao desarquivar.');
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
        const columnWidths = Array(11).fill('*');
        
        // Dados da tabela
        const tableBody = [];
        
        // Agrupar dados por inscrição/pet
        inscricoesResult.forEach(row => {
            if (row.pet_id) {
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
        
        // Resumo final
        const totalPets = tableBody.length;
        const responsaveisUnicos = [...new Set(inscricoesResult.filter(row => row.pet_id).map(row => row.nome_responsavel))].length;
        
        // Adicionar total antes do header da tabela
        content.push({
            text: sanitizeTextForPdf(`Total: ${responsaveisUnicos} responsável(is) com ${totalPets} pet(s) inscritos`),
            style: 'totalStyle',
            alignment: 'center',
            margin: [0, 0, 0, 5]
        });
        
        // Adicionar cabeçalhos da tabela
        content.push({
            table: {
                widths: columnWidths,
                headerRows: 1,
                keepWithHeader: true,
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
        
        // Adicionar tabela com dados
        if (tableBody.length > 0) {
            content.push({
                table: {
                    headerRows: 0,
                    widths: columnWidths,
                    keepWithHeader: true,
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
                                text: 'Rua Pascoal Eugenio Brasini, 701\nJd. Eldorado\nMarília - SP\nhttps://amoranimal.ong.br',
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
                totalStyle: {
                    fontSize: 11,
                    alignment: 'center',
                    margin: [0, 0, 0, 5],
                    bold: true,
                    color: '#CC0000'
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
        const deleteSql = `DELETE FROM mutirao_inscricao WHERE id = $1`;
        const result = await pool.query(deleteSql, [id]);

        if (result.rowCount === 0) {
            console.warn(`[castracaoRoutes DELETE] Nenhum registro encontrado na tabela 'mutirao_inscricao' com ID: ${id} para deletar.`);
            req.flash('error', 'Inscrição não encontrada.');
        } else {
            console.log(`[castracaoRoutes DELETE] Registro de mutirão com ID: ${id} deletado.`);
            req.flash('success', 'Inscrição de mutirão removida com sucesso.');
        }
        res.redirect('/home');

    } catch (error) {
        console.error(`[castracaoRoutes DELETE /mutirao/delete/:id] Erro ao deletar inscrição de mutirão com ID: ${id}:`, error);
        res.status(500).render('error', { error: 'Erro ao deletar a inscrição de mutirão. Tente novamente.' });
    }
});

module.exports = router;
 
