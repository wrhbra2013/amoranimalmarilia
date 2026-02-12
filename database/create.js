const { pool } = require('./database');
 
 async function executeDDL(ddlQuery, tableName) {
  try {
    await pool.query(ddlQuery);
    // console.log(`Tabela: ${tableName} (PostgreSQL) verificada/criada com sucesso.`);
  } catch (err) {
    console.error(`Erro ao criar/verificar tabela ${tableName} (PostgreSQL):`, err.message);
    // Lança o erro para que a função chamadora (ex: initializeDatabaseTables) possa tratá-lo.
    throw err;
  }
 }
 
 // --- Table Creation Functions ---
 
 async function create_adocao() {
  const ddl = `CREATE TABLE IF NOT EXISTS adocao (
    id SERIAL PRIMARY KEY,
    arquivo VARCHAR(255),
    nome VARCHAR(255),
    idade VARCHAR(50),
    especie VARCHAR(100),
    porte VARCHAR(50),
    caracteristicas TEXT,
    tutor VARCHAR(255),
    contato VARCHAR(100),
    whatsapp VARCHAR(20),
    termo_arquivo VARCHAR(255),
    origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  await executeDDL(ddl, 'adocao');
 }
 
 async function create_adotante() {
     const ddl = `CREATE TABLE IF NOT EXISTS adotante (
          id SERIAL PRIMARY KEY,
          origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          q1 INT,
          q2 INT,
          q3 INT,
          qTotal INT,
          nome VARCHAR(255),
          contato VARCHAR(100),
          whatsapp VARCHAR(20),
          cep VARCHAR(10),
          endereco VARCHAR(255),
          numero VARCHAR(20),
          complemento VARCHAR(100),
          bairro VARCHAR(100),
          cidade VARCHAR(100),
          estado VARCHAR(50),
          idPet INT,
          FOREIGN KEY (idPet) REFERENCES adocao (id) ON DELETE SET NULL
     );`;
  await executeDDL(ddl, 'adotante');
 }
 
 async function create_adotado() {
     const ddl = `CREATE TABLE IF NOT EXISTS adotado (
          id SERIAL PRIMARY KEY,
          origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          arquivo VARCHAR(255),
          pet VARCHAR(255),
          tutor VARCHAR(255),
          historia TEXT
      );`;
  await executeDDL(ddl, 'adotado');
 }
 
 async function create_castracao() {
      const ddl = `CREATE TABLE IF NOT EXISTS castracao (
          id SERIAL PRIMARY KEY,
          origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ticket VARCHAR(50) UNIQUE NOT NULL,
          nome VARCHAR(255),
          contato VARCHAR(100),
          whatsapp VARCHAR(20),
          arquivo VARCHAR(255),
          idade INT,
          especie VARCHAR(100),
          porte VARCHAR(50),
          clinica VARCHAR(255),
          agenda VARCHAR(255),
          status VARCHAR(50) DEFAULT 'PENDENTE',
          atendido_em TIMESTAMP NULL
      );`;
   await executeDDL(ddl, 'castracao');
   
   // Adiciona a coluna 'tipo' se não existir
   try {
       await pool.query(`ALTER TABLE castracao ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'padrao';`);
       console.log("Coluna 'tipo' adicionada ou já existe na tabela castracao");
   } catch (error) {
       console.log("Erro ao adicionar coluna 'tipo' (pode já existir):", error.message);
   }
  }
 
 async function create_procura_se() {
     const ddl = `CREATE TABLE IF NOT EXISTS procura_se (
          id SERIAL PRIMARY KEY,
          origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          arquivo VARCHAR(255),
          nomePet VARCHAR(255),
          idadePet VARCHAR(50),
          especie VARCHAR(100),
          porte VARCHAR(50),
          caracteristicas TEXT,
          local VARCHAR(255),
          tutor VARCHAR(255),
          contato VARCHAR(100),
          whatsapp VARCHAR(20)
      );`;
  await executeDDL(ddl, 'procura_se');
 }
 
 async function create_parceria() {
     const ddl = `CREATE TABLE IF NOT EXISTS parceria (
          id SERIAL PRIMARY KEY,
          origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          empresa VARCHAR(255),
          localidade VARCHAR(255),
          proposta TEXT,
          representante VARCHAR(255),
          telefone VARCHAR(20),
          whatsapp VARCHAR(20),
          email VARCHAR(255)
     );`;
  await executeDDL(ddl, 'parceria');
 }
 
async function create_clinicas() {
    const ddl = `CREATE TABLE IF NOT EXISTS clinicas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE,
        endereco VARCHAR(255),
        telefone VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;
    await executeDDL(ddl, 'clinicas');
}

async function create_mutirao_inscricao() {
    const ddl = `CREATE TABLE IF NOT EXISTS mutirao_inscricao (
        id SERIAL PRIMARY KEY,
        calendario_mutirao_id INTEGER REFERENCES calendario_mutirao(id),
        nome_responsavel VARCHAR(255) NOT NULL,
        localidade VARCHAR(255),
        contato VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;
    await executeDDL(ddl, 'mutirao_inscricao');
}

async function create_mutirao_pet() {
    const ddl = `CREATE TABLE IF NOT EXISTS mutirao_pet (
        id SERIAL PRIMARY KEY,
        mutirao_inscricao_id INTEGER REFERENCES mutirao_inscricao(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        especie VARCHAR(20) CHECK (especie IN ('gato', 'cachorro')),
        sexo VARCHAR(10) CHECK (sexo IN ('macho', 'femea')),
        idade VARCHAR(50),
        peso VARCHAR(20),
        vacinado BOOLEAN DEFAULT FALSE,
        medicamento VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`;
    await executeDDL(ddl, 'mutirao_pet');
}
 
async function create_voluntario() {
    const ddl = `CREATE TABLE IF NOT EXISTS voluntario (
        id SERIAL PRIMARY KEY,
        origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        nome VARCHAR(255),
        localidade VARCHAR(255),
        telefone VARCHAR(20),
        whatsapp VARCHAR(20),
        disponibilidade TEXT,
        habilidade TEXT,
        mensagem TEXT
    );`;
    await executeDDL(ddl, 'voluntario');
 }
 
 async function create_interesse_voluntario() {
    const ddl = `CREATE TABLE IF NOT EXISTS interesse_voluntario (
        id SERIAL PRIMARY KEY,
        origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        nome VARCHAR(255),
        telefone VARCHAR(20),
        localidade VARCHAR(255),
        habilidade TEXT,
        disponibilidade TEXT,
        como_ajudar TEXT
    );`;
    await executeDDL(ddl, 'interesse_voluntario');
 }
 
 async function create_coleta() {
     const ddl = `CREATE TABLE IF NOT EXISTS coleta (
         id SERIAL PRIMARY KEY,
         origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         nome VARCHAR(255),
         telefone VARCHAR(20),
         whatsapp VARCHAR(20),
         item VARCHAR(255),
         quantidade VARCHAR(50),
         dia VARCHAR(10),
         hora TIME,
         cep VARCHAR(10),
         endereco VARCHAR(255),
         numero VARCHAR(20),
         complemento VARCHAR(100),
         bairro VARCHAR(100),
         cidade VARCHAR(100),
         estado VARCHAR(50),
         mensagem TEXT
     );`;
     await executeDDL(ddl, 'coleta');
     
 }
 

 async function create_home() {
     const ddl = `CREATE TABLE IF NOT EXISTS home (
          id SERIAL PRIMARY KEY,
          origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          arquivo VARCHAR(255),
          titulo VARCHAR(255),
          mensagem TEXT,
          link VARCHAR(2083)
      );`;
  await executeDDL(ddl, 'home');
 }

async function create_eventos() {
    const ddl = `CREATE TABLE IF NOT EXISTS eventos (
        id SERIAL PRIMARY KEY,
        origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        titulo VARCHAR(255),
        data_evento DATE,
        arquivo VARCHAR(255),
        descricao TEXT
    );`;
    await executeDDL(ddl, 'eventos');
}

async function create_calendario_castracao() {
    const ddl = `CREATE TABLE IF NOT EXISTS calendario_castracao (
        id SERIAL PRIMARY KEY,
        data_evento DATE NOT NULL,
        clinica VARCHAR(255) NOT NULL,
        vagas INT DEFAULT 0,
        criado_por VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    await executeDDL(ddl, 'calendario_castracao');
}

async function create_mutirao_castracao() {
    const ddl = `CREATE TABLE IF NOT EXISTS mutirao_castracao (
        id SERIAL PRIMARY KEY,
        origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        calendario_id INT,
        tutor_nome VARCHAR(255),
        tutor_contato VARCHAR(100),
        vagas_solicitadas INT DEFAULT 1,
        animais JSONB, -- [{"genero":"F","nome":"...","idade":"...","peso":"...","vacinado":true,"medicamentos":"..."}, ...]
        status VARCHAR(50) DEFAULT 'PENDENTE',
        FOREIGN KEY (calendario_id) REFERENCES calendario_castracao(id) ON DELETE SET NULL
    );`;
    await executeDDL(ddl, 'mutirao_castracao');
}

async function create_calendario_mutirao() {
    const ddl = `CREATE TABLE IF NOT EXISTS calendario_mutirao (
        id SERIAL PRIMARY KEY,
        data_evento DATE NOT NULL,
        clinica VARCHAR(255) NOT NULL,
        vagas INT DEFAULT 0,
        criado_por VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    await executeDDL(ddl, 'calendario_mutirao');
}

async function create_evento_fotos() {
    const ddl = `CREATE TABLE IF NOT EXISTS evento_fotos (
        id SERIAL PRIMARY KEY,
        evento_id INT NOT NULL,
        arquivo VARCHAR(255),
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
    );`;
    await executeDDL(ddl, 'evento_fotos');
}
 
 async function create_evento_comments() {
    const ddl = `CREATE TABLE IF NOT EXISTS evento_comments (
        id SERIAL PRIMARY KEY,
        evento_id INT NOT NULL,
        nome VARCHAR(255),
        comentario TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
    );`;
    await executeDDL(ddl, 'evento_comments');
 }

 async function create_campanha_fotos() {
   const ddl = `CREATE TABLE IF NOT EXISTS campanha_fotos (
        id SERIAL PRIMARY KEY,
        campanha_id INT NOT NULL,
        arquivo VARCHAR(255),
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campanha_id) REFERENCES home(id) ON DELETE CASCADE
    );`;
    await executeDDL(ddl, 'campanha_fotos');
 }

async function create_campanha_foto_comments() {
    const ddl = `CREATE TABLE IF NOT EXISTS campanha_foto_comments (
        id SERIAL PRIMARY KEY,
        foto_id INT NOT NULL,
        nome VARCHAR(255),
        comentario TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (foto_id) REFERENCES campanha_fotos(id) ON DELETE CASCADE
    );`;
    await executeDDL(ddl, 'campanha_foto_comments');
}

// Migração para adicionar coluna 'descricao' caso esteja faltando em bases legadas
async function migrateCampanhaFotosDescricaoColumn() {
    const checkColumnSql = `SELECT column_name FROM information_schema.columns WHERE table_name='campanha_fotos' AND column_name='descricao'`;
    const alterTableSql = `ALTER TABLE campanha_fotos ADD COLUMN descricao TEXT;`;

    try {
        const result = await pool.query(checkColumnSql);
        if (result.rows.length === 0) {
            console.log("MIGRATION: Adicionando coluna 'descricao' na tabela 'campanha_fotos'.");
            await pool.query(alterTableSql);
            console.log("MIGRATION: Coluna 'descricao' adicionada com sucesso na tabela 'campanha_fotos'.");
        }
    } catch (error) {
        console.error("MIGRATION-ERROR: Falha ao migrar tabela 'campanha_fotos' (descricao):", error);
    }
}
 
 async function create_transparencia() {
    const ddl = `CREATE TABLE IF NOT EXISTS transparencia (
        id SERIAL PRIMARY KEY,
        origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        titulo VARCHAR(255),
        tipo VARCHAR(50),
        ano INT,
        arquivo VARCHAR(255),
        descricao TEXT
    );`;
    await executeDDL(ddl, 'transparencia');
 }
 
 async function create_solicitacao_acesso() {
    const ddl = `CREATE TABLE IF NOT EXISTS solicitacao_acesso (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        organizacao VARCHAR(255) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        email VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDENTE', -- PENDENTE, APROVADO, REJEITADO
        token VARCHAR(255),
        cpf VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    await executeDDL(ddl, 'solicitacao_acesso');
 }
 
 async function create_login() {
  const ddl = `CREATE TABLE IF NOT EXISTS login (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL, -- Lembre-se de usar HASH para senhas em produção
    isAdmin BOOLEAN DEFAULT FALSE,
    origem TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  await executeDDL(ddl, 'login');
 }
 
 async function create_admin_user() {
  try {
    // Use 'pool' which is defined in this module's scope
    const result = await pool.query('SELECT usuario FROM login WHERE usuario = $1', ['@admin']);

    if (result.rows.length === 0) {
      // IMPORTANTE: A senha '@admin' aqui é insegura.
      // Em um sistema real, use hashing (ex: bcrypt) para armazenar senhas.
      // E permita que a senha do admin seja configurável ou gerada de forma segura.
      const insertSQL = `INSERT INTO login (usuario, senha, isAdmin) VALUES ($1, $2, $3)`;

      // pool.query returns a promise, no need to wrap it in another one.
      await pool.query(insertSQL, ['@admin', '@admin', true]);
      console.log("Usuário padrão '@admin' criado com sucesso.");
    } else {
      console.log("Usuário padrão '@admin' já existe.");
    }
  } catch (error) {
    console.error("Erro ao criar usuário admin (PostgreSQL):", error.message);
    throw error;
  }
 }
 
/**
 * Migra a coluna 'idade' da tabela 'adocao' de INT para VARCHAR se necessário.
 * Isso é para corrigir uma alteração de schema em uma base de dados existente.
 */
async function migrateAdocaoIdadeColumn() {
    const checkColumnSql = `
        SELECT data_type 
        FROM information_schema.columns
        WHERE table_name = 'adocao' AND column_name = 'idade';
    `;
    const alterColumnSql = `ALTER TABLE adocao ALTER COLUMN idade TYPE VARCHAR(50);`;

    try {
        const result = await pool.query(checkColumnSql);
        // Se a coluna existe e o tipo é 'integer'
        if (result.rows.length > 0 && result.rows[0].data_type === 'integer') {
            console.log("MIGRATION: Alterando a coluna 'idade' da tabela 'adocao' de INTEGER para VARCHAR(50).");
            await pool.query(alterColumnSql);
            console.log("MIGRATION: Coluna 'idade' da tabela 'adocao' alterada com sucesso.");
        }
    } catch (error) {
        // Não lançar erro fatal, apenas registrar.
        // A aplicação pode falhar em outro lugar se a migração for necessária e falhar.
        console.error("MIGRATION-ERROR: Falha ao tentar migrar a coluna 'idade' da tabela 'adocao':", error);
    }
}

/**
 * Migra a tabela 'adocao' adicionando a coluna 'termo_arquivo' se não existir.
 */
async function migrateAdocaoTermoColumn() {
    const checkColumnSql = `
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'adocao' AND column_name = 'termo_arquivo';
    `;
    const alterTableSql = `ALTER TABLE adocao ADD COLUMN termo_arquivo VARCHAR(255);`;

    try {
        const result = await pool.query(checkColumnSql);
        if (result.rows.length === 0) {
            console.log("MIGRATION: Adicionando coluna 'termo_arquivo' na tabela 'adocao'.");
            await pool.query(alterTableSql);
            console.log("MIGRATION: Coluna 'termo_arquivo' adicionada com sucesso.");
        }
    } catch (error) {
        console.error("MIGRATION-ERROR: Falha ao migrar tabela 'adocao' (termo_arquivo):", error);
    }
}

/**
 * Migra a tabela 'solicitacao_acesso' adicionando a coluna 'cpf' se não existir.
 */
async function migrateSolicitacaoAcessoCpfColumn() {
    const checkColumnSql = `
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'solicitacao_acesso' AND column_name = 'cpf';
    `;
    const alterTableSql = `ALTER TABLE solicitacao_acesso ADD COLUMN cpf VARCHAR(20);`;

    try {
        const result = await pool.query(checkColumnSql);
        if (result.rows.length === 0) {
            console.log("MIGRATION: Adicionando coluna 'cpf' na tabela 'solicitacao_acesso'.");
            await pool.query(alterTableSql);
            console.log("MIGRATION: Coluna 'cpf' adicionada com sucesso.");
        }
    } catch (error) {
        console.error("MIGRATION-ERROR: Falha ao migrar tabela 'solicitacao_acesso':", error);
    }
}

/**
 * Garante que a coluna 'status' exista na tabela 'castracao'.
 * Adiciona a coluna com valor default 'PENDENTE' quando ausente.
 */
async function migrateCastracaoStatusColumn() {
    const checkColumnSql = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'castracao' AND column_name = 'status';
    `;
    const alterTableSql = `ALTER TABLE castracao ADD COLUMN status VARCHAR(50) DEFAULT 'PENDENTE';`;

    try {
        const result = await pool.query(checkColumnSql);
        if (result.rows.length === 0) {
            console.log("MIGRATION: Adicionando coluna 'status' na tabela 'castracao'.");
            await pool.query(alterTableSql);
            console.log("MIGRATION: Coluna 'status' adicionada com sucesso na tabela 'castracao'.");
        }
    } catch (error) {
        console.error("MIGRATION-ERROR: Falha ao migrar tabela 'castracao' (status):", error);
    }
}

/**
 * Garante que a coluna 'atendido_em' exista na tabela 'castracao'.
 * Armazena o timestamp de quando o agendamento foi atendido.
 */
async function migrateCastracaoAtendidoColumn() {
    const checkColumnSql = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'castracao' AND column_name = 'atendido_em';
    `;
    const alterTableSql = `ALTER TABLE castracao ADD COLUMN atendido_em TIMESTAMP NULL;`;

    try {
        const result = await pool.query(checkColumnSql);
        if (result.rows.length === 0) {
            console.log("MIGRATION: Adicionando coluna 'atendido_em' na tabela 'castracao'.");
            await pool.query(alterTableSql);
            console.log("MIGRATION: Coluna 'atendido_em' adicionada com sucesso na tabela 'castracao'.");
        }
    } catch (error) {
        console.error("MIGRATION-ERROR: Falha ao migrar tabela 'castracao' (atendido_em):", error);
    }
}

 /**
   * Função para inicializar todas as tabelas do banco de dados.
   * Chame esta função durante a inicialização da sua aplicação.
   */
 async function initializeDatabaseTables() {
     try {
      await create_adocao();
      await migrateAdocaoIdadeColumn(); // Executa a migração após garantir que a tabela existe
      await migrateAdocaoTermoColumn(); // Garante que a coluna termo_arquivo exista
      await create_adotante();
      await create_adotado();
      await create_castracao();
      // Garante que, em bases legadas, a coluna 'status' exista
      await migrateCastracaoStatusColumn();
    // Garante que, em bases legadas, a coluna 'atendido_em' exista
    await migrateCastracaoAtendidoColumn();
      await create_procura_se();
      await create_clinicas();
      await create_mutirao_inscricao();
      await create_mutirao_pet();
       await create_parceria();
      await create_voluntario();
      await create_interesse_voluntario();
      await create_coleta();
    await create_home();
            await create_eventos();
        await create_evento_fotos();
        await create_evento_comments();
    await create_campanha_fotos();
    await migrateCampanhaFotosDescricaoColumn();
    await create_campanha_foto_comments();
        await create_calendario_castracao();
        await create_mutirao_castracao();
        await create_calendario_mutirao();
      await create_transparencia();
      await create_solicitacao_acesso();
      await migrateSolicitacaoAcessoCpfColumn(); // Garante que a coluna CPF exista
      await create_login();
      await create_admin_user(); // Deve ser chamado após create_login
    } catch (error) {
      console.error("Erro fatal durante a inicialização das tabelas (PostgreSQL):", error.message);
      throw error;
    }
  }
 
  module.exports = {
     create_home,
     create_adocao,
     create_adotante,
     create_adotado,
     create_castracao,
     create_clinicas,
     create_mutirao_inscricao,
     create_mutirao_pet,
     create_procura_se,
     create_parceria,
     create_login,
     create_interesse_voluntario,
     create_transparencia,
     create_solicitacao_acesso,
     create_calendario_mutirao,
     initializeDatabaseTables
 };
 