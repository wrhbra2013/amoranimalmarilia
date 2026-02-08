const express = require('express');
const router = express.Router();
const { executeQuery } = require('../database/queries');
const { insert_eventos, insert_evento_foto, insert_evento_comment } = require('../database/insert');
const { uploadEventos } = require('../utils/multerConfig'); // Certifique-se de ter essa configuração
const fs = require('fs').promises;
const path = require('path');
const { isAdmin } = require('../middleware/auth');

// Função auxiliar para sanitizar nomes de pasta (remove acentos e caracteres especiais)
const sanitizeName = (name) => {
    return (name || 'evento').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
};

// Mantemos a rota pública /eventos redirecionando para a home (lista consolidada na página inicial)
router.get('/', (req, res) => {
    res.redirect('/');
});

// GET /eventos/form - Exibe o formulário para criar um novo evento
router.get('/form', isAdmin, (req, res) => {
    res.render('eventos_form'); // Crie uma view chamada eventos_form.ejs
});

// POST /eventos/form - Processa o formulário de criação de evento
router.post('/form', isAdmin, uploadEventos.single('arquivo'), async (req, res) => {
    if (!req.file) {
        req.flash('error', 'É necessário enviar uma foto para o evento.');
        return res.redirect('/eventos/form');
    }

    const filename = req.file.filename;
    const { titulo, data: data_evento, descricao } = req.body;

    try {
        // 1. Insere o evento no banco para obter o ID
        const result = await insert_eventos(titulo || null, data_evento || null, filename, descricao || null);
        const eventoId = result.insertId;

        // 2. Cria a subpasta para o evento: ID_TituloSanitizado
        const folderName = `${eventoId}_${sanitizeName(titulo)}`;
        const baseDir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'eventos');
        const targetDir = path.join(baseDir, folderName);
        await fs.mkdir(targetDir, { recursive: true });

        // 3. Move a foto enviada para a nova subpasta e atualiza o registro no banco
        await fs.rename(req.file.path, path.join(targetDir, filename));
        const newRelativePath = `${folderName}/${filename}`;
        await executeQuery('UPDATE eventos SET arquivo = $1 WHERE id = $2', [newRelativePath, eventoId]);

        req.flash('success', 'Evento criado com sucesso!');
        res.redirect('/eventos'); // Redireciona para a lista de eventos
    } catch (error) {
        console.error("Erro ao salvar evento:", error);
        // Remove o arquivo enviado em caso de erro no banco
        if (req.file) {
            await fs.unlink(req.file.path).catch(err => console.error("Erro ao remover arquivo após falha:", err));
        }
        req.flash('error', 'Erro ao criar evento. Tente novamente.');
        res.redirect('/eventos/form');
    }
});

// POST /eventos/delete/:id/:arquivo - Deleta um evento
router.post('/delete/:id/:arquivo', isAdmin, async (req, res) => {
    const { id, arquivo } = req.params;
    try {
        // Busca o caminho real do arquivo no banco antes de deletar
        const rows = await executeQuery('SELECT arquivo FROM eventos WHERE id = $1', [id]);
        const arquivoDb = rows.length > 0 ? rows[0].arquivo : arquivo;

        // Deleta do banco de dados
        await executeQuery('DELETE FROM eventos WHERE id = $1', [id]);

        // Deleta o arquivo físico ou a pasta do evento
        const uploadsDir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'eventos');
        
        if (arquivoDb && arquivoDb.includes('/')) {
            // Se tem barra, está numa subpasta -> remove a pasta inteira do evento
            const folderName = path.dirname(arquivoDb);
            await fs.rm(path.join(uploadsDir, folderName), { recursive: true, force: true }).catch(() => {});
        } else {
            // Legado (na raiz) -> remove apenas o arquivo
            await fs.unlink(path.join(uploadsDir, path.basename(arquivoDb))).catch(() => {});
        }

        req.flash('success', 'Evento removido com sucesso.');
        res.redirect('/'); // Redireciona para a home (lista consolidada)
    } catch (error) {
        console.error("Erro ao deletar evento:", error);
        req.flash('error', 'Erro ao remover evento.');
        res.redirect('/');
    }
});

// Rota para deletar foto de evento
router.post('/foto/delete/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const rows = await executeQuery('SELECT * FROM evento_fotos WHERE id = $1', [id]);
        if (!rows || rows.length === 0) return res.redirect('/');
        const foto = rows[0];
        await executeQuery('DELETE FROM evento_fotos WHERE id = $1', [id]);
        // remove arquivo fisico
        const filePath = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'eventos', foto.arquivo);
        await fs.unlink(filePath).catch(() => {});
        req.flash('success', 'Foto removida.');
        res.redirect(`/eventos/${foto.evento_id}`);
    } catch (error) {
        console.error('Erro ao deletar foto de evento:', error);
        res.redirect('/');
    }
});

// Rota para exibir formulário dedicado para adicionar foto a um evento (admin)
router.get('/:id/adicionar-foto', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const rows = await executeQuery('SELECT id, titulo FROM eventos WHERE id = $1', [id]);
        if (!rows || rows.length === 0) {
            req.flash('error', 'Evento não encontrado.');
            return res.redirect('/');
        }
        const evento = rows[0];
        res.render('eventos_add_foto', { evento, success_msg: req.flash('success'), error_msg: req.flash('error') });
    } catch (error) {
        console.error('Erro ao carregar página de adicionar foto do evento:', error);
        req.flash('error', 'Erro ao carregar o formulário.');
        res.redirect(`/eventos/${id}`);
    }
});

// Outras rotas conforme necessário (ex: para visualizar detalhes de um evento)

// GET /eventos/:id - Exibe detalhes do evento e fotos associadas
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const rows = await executeQuery('SELECT * FROM eventos WHERE id = $1', [id]);
        if (!rows || rows.length === 0) return res.status(404).render('error', { error: 'Evento não encontrado.' });
        const evento = rows[0];
        const fotos = await executeQuery('SELECT * FROM evento_fotos WHERE evento_id = $1 ORDER BY id DESC', [id]);
        const comments = await executeQuery('SELECT * FROM evento_comments WHERE evento_id = $1 ORDER BY created_at DESC', [id]);

        res.render('eventos_view', { evento, fotos, comments, success_msg: req.flash('success'), error_msg: req.flash('error'), isAdmin: req.isAdmin || false });
    } catch (error) {
        console.error('Erro ao carregar evento:', error);
        res.status(500).render('error', { error: 'Erro ao carregar o evento.' });
    }
});

// POST /eventos/:id/foto - Upload de foto para evento (admin)
router.post('/:id/foto', isAdmin, uploadEventos.single('foto'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        req.flash('error', 'Nenhuma foto enviada.');
        return res.redirect(`/eventos/${id}`);
    }

    try {
        const filename = req.file.filename;
        const descricao = req.body.descricao ? String(req.body.descricao).trim() : null;

        // Busca evento para determinar a pasta correta
        const rows = await executeQuery('SELECT * FROM eventos WHERE id = $1', [id]);
        if (!rows || rows.length === 0) throw new Error('Evento não encontrado');
        const evento = rows[0];

        // Define a pasta: usa a existente (se houver) ou cria uma nova baseada no ID
        const folderName = (evento.arquivo && evento.arquivo.includes('/')) 
            ? path.dirname(evento.arquivo) 
            : `${evento.id}_${sanitizeName(evento.titulo)}`;

        const targetDir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'eventos', folderName);
        await fs.mkdir(targetDir, { recursive: true });
        await fs.rename(req.file.path, path.join(targetDir, filename));

        const relativePath = `${folderName}/${filename}`;
        await insert_evento_foto(id, relativePath, descricao);
        req.flash('success', 'Foto adicionada ao evento.');
        res.redirect(`/eventos/${id}`);
    } catch (error) {
        console.error('Erro ao salvar foto do evento:', error);
        // tenta remover arquivo salvo
        await fs.unlink(req.file.path).catch(() => {});
        req.flash('error', 'Erro ao salvar a foto.');
        res.redirect(`/eventos/${id}`);
    }
});

// POST /eventos/:id/comment - Adicionar comentário público ao evento
router.post('/:id/comment', async (req, res) => {
    const { id } = req.params;
    const nome = req.body.nome ? String(req.body.nome).trim() : 'Anônimo';
    const comentario = req.body.comentario ? String(req.body.comentario).trim() : '';

    if (!comentario) {
        req.flash('error', 'O comentário não pode estar vazio.');
        return res.redirect(`/eventos/${id}`);
    }

    try {
        await insert_evento_comment(id, nome, comentario);
        req.flash('success', 'Comentário adicionado com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar comentário ao evento:', error);
        req.flash('error', 'Erro ao salvar o comentário.');
    }
    res.redirect(`/eventos/${id}`);
});

module.exports = router;
