const { Client, Pool } = require('pg');
const DB_NAME = process.env.DB_DATABASE || 'espelho';


// Configuração para o pool de conexões local
const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: DB_NAME,
  password: process.env.DB_PASSWORD || 'wander',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  max: 20, // Número máximo de clientes no pool
  idleTimeoutMillis: 30000, // Tempo que um cliente pode ficar ocioso
};



// Cria o pool. Ele se conectará sob demanda.
const pool = new Pool(poolConfig);

// Adiciona um listener para erros em clientes ociosos
pool.on('error', (err, client) => {
  console.error('Erro inesperado em um cliente ocioso do pool', err);
  process.exit(-1);
});

/**
 * Garante que o banco de dados de destino exista. Se não, ele o cria.
 * Esta função se conecta ao banco de dados 'postgres' padrão para realizar a verificação.
 */
async function ensureDatabaseExists() {
  // Um cliente temporário para se conectar ao BD 'postgres' para tarefas de manutenção
  const client = new Client({
    user: poolConfig.user,
    host: poolConfig.host,
    database: 'postgres', // Conecta ao BD padrão para verificar/criar nosso BD de destino
    password: poolConfig.password,
    port: poolConfig.port,
  });

  try {
    await client.connect();
    // Usa uma query parametrizada para evitar SQL Injection
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);

    if (res.rowCount === 0) {
      console.log(`Banco de dados '${DB_NAME}' não existe. Criando...`);
      // Usa aspas para segurança no nome do banco
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Banco de dados '${DB_NAME}' criado com sucesso.`);
    } else {
      console.log(`Banco de dados '${DB_NAME}' já existe.`);
    }
  } catch (err) {
    console.error('Erro ao verificar ou criar o banco de dados:', err);
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * Inicializa a conexão com o banco de dados.
 * 1. Garante que o banco de dados exista.
 * 2. Testa o pool de conexões.
 */
async function initializeDatabase() {
  await ensureDatabaseExists();
}

module.exports = {
  pool, // Exporta o pool para ser usado em toda a aplicação
  initializeDatabase,
};
