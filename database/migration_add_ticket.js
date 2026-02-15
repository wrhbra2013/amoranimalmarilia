const { pool } = require('./database');

async function migrationAddTicketColumn() {
  const client = await pool.connect();
  
  try {
    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mutirao_inscricao' AND column_name = 'ticket'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('Coluna "ticket" já existe. Nenhuma migração necessária.');
      return;
    }

    console.log('Adicionando coluna "ticket" à tabela mutirao_inscricao...');
    
    // Add column without NOT NULL constraint first
    await client.query(`
      ALTER TABLE mutirao_inscricao 
      ADD COLUMN ticket VARCHAR(50) UNIQUE
    `);

    // Get all existing records ordered by id
    const existingRecords = await client.query(`
      SELECT id FROM mutirao_inscricao ORDER BY id ASC
    `);

    console.log(`Encontrados ${existingRecords.rows.length} registros existentes.`);

    // Populate tickets sequentially
    for (let i = 0; i < existingRecords.rows.length; i++) {
      const ticketNumber = String(i + 1).padStart(4, '0');
      await client.query(`
        UPDATE mutirao_inscricao 
        SET ticket = $1 
        WHERE id = $2
      `, [ticketNumber, existingRecords.rows[i].id]);
    }

    // Add NOT NULL constraint
    await client.query(`
      ALTER TABLE mutirao_inscricao 
      ALTER COLUMN ticket SET NOT NULL
    `);

    console.log('Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('Erro na migração:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  migrationAddTicketColumn()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrationAddTicketColumn };
