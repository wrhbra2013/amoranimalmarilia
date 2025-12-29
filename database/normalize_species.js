const { pool } = require('./database');

// Script para padronizar valores de 'especie' no banco para 'felino' quando aplicável.
// Uso: node database/normalize_species.js

const tablesToCheck = [
  'adocao',
  'interessados_adocao',
  'procura_se',
  'castracao',
  'adotado'
];

const gatoVariants = ['gato', 'gatos', 'gatinho', 'gatinhos'];

function lowerTrimCol(col) {
  return `LOWER(TRIM(${col}))`;
}

async function tableHasColumn(table, column) {
  const q = `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`;
  const res = await pool.query(q, [table, column]);
  return res.rowCount > 0;
}

async function run() {
  try {
    for (const table of tablesToCheck) {
      const has = await tableHasColumn(table, 'especie');
      if (!has) {
        console.log(`Tabela '${table}' não possui coluna 'especie', pulando.`);
        continue;
      }

      const variantsList = gatoVariants.map(v => `'${v}'`).join(', ');
      const updateSql = `UPDATE ${table} SET especie = 'felino' WHERE ${lowerTrimCol('especie')} IN (${variantsList})`;

      const res = await pool.query(updateSql);
      console.log(`Tabela '${table}': atualizados ${res.rowCount} registros (gato -> felino).`);
    }
  } catch (err) {
    console.error('Erro ao normalizar espécies:', err);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
