  // routes/relatorioRoutes.js
  const express = require('express');
  const {
   pool
  } = require('../database/database'); // Importa a instância do banco PostgreSQL
  const fsPromises = require('fs').promises;
  const fsNode = require('fs'); // Para streams síncronos e verificação de existência
  const path = require('path');
  const {
   isAdmin
  } = require('../middleware/auth');
  const router = express.Router();
 
  const PdfPrinter = require('pdfmake');
 
  // Função para sanitizar texto para o PDF
  function sanitizeTextForPdf(text) {
   if (text === null || text === undefined) {
    return '';
   }
   let str = String(text);
   // eslint-disable-next-line no-control-regex
   str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
   str = str.replace(/^\s+|\s+$/g, '').replace(/ +/g, ' ');
   return str;
  }
 
  const fontDescriptors = {
   Roboto: {
    normal: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Regular.ttf'),
    bold: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Medium.ttf'),
    italics: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, '..', 'static', 'fonts', 'Roboto-MediumItalic.ttf')
   }
  };
 
  Object.values(fontDescriptors.Roboto).forEach(fontPath => {
   if (!fsNode.existsSync(fontPath)) {
    console.warn(`[PDF Font Warning] Arquivo de fonte não encontrado: ${fontPath}. Isso pode causar erros na geração do PDF ou PDF inválido.`);
   }
  });
 
  const printer = new PdfPrinter(fontDescriptors);
 
  const TABELAS_PERMITIDAS = ['adocao', 'adotante', 'adotado', 'castracao', 'procura_se', 'parceria', 'home', 'login', 'voluntario', 'interesse_voluntario', 'interessados_adocao', 'coleta', 'clinicas'];
  const TABELAS_COM_COLUNA_ORIGEM = ['adocao', 'adotante', 'adotado', 'castracao', 'procura_se', 'parceria', 'home', 'login', 'voluntario', 'coleta', 'interesse_voluntario'];

  async function getAllTables() {
    try {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      return result.rows.map(row => row.table_name);
    } catch (error) {
      console.error('[getAllTables] Erro ao buscar tabelas:', error.message);
      return TABELAS_PERMITIDAS;
    }
  }
 
async function fetchReportData(tabela) {
    const allTables = await getAllTables();
    if (!allTables.includes(tabela)) {
     const error = new Error(`Nome de tabela inválido: ${tabela}`);
     error.status = 400;
     throw error;
    }
   
    let sql;
    let selectFields = "*";
   
    // Define timestamp columns for each table with their formats
    const timestampColumns = {
        // Tables with origem TIMESTAMP
        'home': [{column: 'origem', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        'adocao': [{column: 'origem', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        'adotante': [{column: 'origem', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        'adotado': [{column: 'origem', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        'procura_se': [{column: 'origem', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        'parceria': [{column: 'origem', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        'voluntario': [{column: 'origem', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        'interesse_voluntario': [{column: 'origem', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        'coleta': [{column: 'origem', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        
        // Tables with created_at TIMESTAMP WITH TIME ZONE
        'clinicas': [{column: 'created_at', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        'mutirao_inscricao': [{column: 'created_at', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        'mutirao_pet': [{column: 'created_at', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'}],
        
        // Tables with data_evento DATE
        'castracao': [
            {column: 'origem', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'},
            {column: 'atendimento', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'},
            {column: 'atendido_em', format: 'DD/MM/YYYY HH24:MI:SS', type: 'timestamp'},
            {column: 'data_evento', format: 'DD/MM/YYYY', type: 'date'}
        ],
        
        // Add other tables as needed
    };
   
    // Check if we have special formatting for this table
    if (timestampColumns[tabela]) {
        // Start with all columns
        let fields = ['*'];
        
        // Add formatted versions of timestamp columns
        timestampColumns[tabela].forEach(colInfo => {
            const formattedColumnName = `${colInfo.column}_formatado`;
            fields.push(`TO_CHAR(${colInfo.column}, '${colInfo.format}') AS ${formattedColumnName}`);
        });
        
        // Also keep the existing year/month extraction for origem if it exists (for backward compatibility)
        if (tabela === 'home' || tabela === 'adocao' || tabela === 'adotante' || tabela === 'adotado' || 
            tabela === 'procura_se' || tabela === 'parceria' || tabela === 'voluntario' || 
            tabela === 'interesse_voluntario' || tabela === 'coleta') {
            fields.push(`CAST(EXTRACT(YEAR FROM origem) AS INTEGER) AS ANO`);
            fields.push(`CAST(EXTRACT(MONTH FROM origem) AS INTEGER) AS MES_NUM`);
            fields.push(`CASE EXTRACT(MONTH FROM origem)
                            WHEN 1 THEN 'Janeiro'
                            WHEN 2 THEN 'Fevereiro'
                            WHEN 3 THEN 'Março'
                            WHEN 4 THEN 'Abril'
                            WHEN 5 THEN 'Maio'
                            WHEN 6 THEN 'Junho'
                            WHEN 7 THEN 'Julho'
                            WHEN 8 THEN 'Agosto'
                            WHEN 9 THEN 'Setembro'
                            WHEN 10 THEN 'Outubro'
                            WHEN 11 THEN 'Novembro'
                            WHEN 12 THEN 'Dezembro'
                            ELSE ''
                        END AS MES_NOME`);
        }
        
        selectFields = fields.join(', ');
        sql = `SELECT ${selectFields} FROM ${tabela}`;
    } else if (TABELAS_COM_COLUNA_ORIGEM.includes(tabela.toLowerCase())) {
        // Fallback to original logic for backward compatibility
        selectFields = `*,
                              TO_CHAR(origem, 'DD/MM/YYYY HH24:MI:SS') AS data,
                              CAST(EXTRACT(YEAR FROM origem) AS INTEGER) AS ANO,
                              CAST(EXTRACT(MONTH FROM origem) AS INTEGER) AS MES_NUM,
                              CASE EXTRACT(MONTH FROM origem)
                                  WHEN 1 THEN 'Janeiro'
                                  WHEN 2 THEN 'Fevereiro'
                                  WHEN 3 THEN 'Março'
                                  WHEN 4 THEN 'Abril'
                                  WHEN 5 THEN 'Maio'
                                  WHEN 6 THEN 'Junho'
                                  WHEN 7 THEN 'Julho'
                                  WHEN 8 THEN 'Agosto'
                                  WHEN 9 THEN 'Setembro'
                                  WHEN 10 THEN 'Outubro'
                                  WHEN 11 THEN 'Novembro'
                                  WHEN 12 THEN 'Dezembro'
                                  ELSE ''
                              END AS MES_NOME`;
        sql = `SELECT ${selectFields} FROM ${tabela}`;
    } else {
     sql = `SELECT ${selectFields} FROM ${tabela};`;
    }
   
    try {
     //  Adapt to use a generalized query function from database.js
     const result = await pool.query(sql);
     return result.rows;
    } catch (dbError) {
    console.error(`[fetchReportData] Erro de banco de dados para '${tabela}':`, dbError.message);
    const errorToThrow = new Error(`Erro ao consultar dados da tabela '${tabela}': ${dbError.message}`);
    errorToThrow.status = dbError.status || 500;
    throw errorToThrow;
   }
   }
 
 
  router.get('/', isAdmin, async (req, res) => {
    const allTables = await getAllTables();
    res.render('relatorio', {
      tabelas: TABELAS_PERMITIDAS,
      todasTabelas: allTables
    });
  });

  router.post('/backup', isAdmin, async (req, res) => {
    const action = req.query.action || req.body.action;
    console.log('[backup] action received:', action, 'query:', req.query, 'body:', req.body);
    const scriptPath = path.join(__dirname, '..', 'scripts', 'backup_db.sh');
    
    const env = {
      ...process.env,
      PGDATABASE: process.env.DB_DATABASE || 'espelho',
      PGHOST: process.env.DB_HOST || 'localhost',
      PGPORT: process.env.DB_PORT || '5432',
      PGUSER: process.env.DB_USER || 'postgres',
      PGPASSWORD: process.env.DB_PASSWORD || 'wander'
    };
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      let command;
      if (action === 'run') {
        command = `bash ${scriptPath}`;
      } else if (action === 'cron') {
        command = `bash ${scriptPath} --cron`;
      } else {
        console.log('[backup] Invalid action:', action);
        return res.json({ success: false, log: 'Ação inválida: ' + action });
      }
      
      console.log('[backup] Executing:', command);
      const { stdout, stderr } = await execAsync(command, { cwd: path.join(__dirname, '..', 'scripts'), env });
      res.json({ success: true, log: stdout + stderr });
    } catch (error) {
      console.log('[backup] Error:', error.message);
      res.json({ success: false, log: `Erro: ${error.message}\n${error.stderr || ''}` });
    }
  });

   router.post('/logs', isAdmin, async (req, res) => {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const command = 'pm2 logs amoranimal --lines 10 --nostream 2>&1 | head -15';
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
      res.json({ success: true, log: stdout + stderr });
    } catch (error) {
      res.json({ success: false, log: `Erro: ${error.message}` });
    }
   });

   router.post('/maintenance', isAdmin, async (req, res) => {
    const option = req.query.option || req.body.option;
    const scriptPath = path.join(__dirname, '..', 'scripts', 'control.sh');
    
    const optionsMap = {
      '1': '1',  // Fluxo completo (sem reiniciar pm2 via API)
      '2': '2',
      '3': '3',
      '4': '4',
      '5': '5',
      '6': '6',
      '7': '7',
      '8': '8',
      '9': '9'
    };
    
    // Opção 1 executa fluxo completo mas sem reiniciar PM2 (bloqueia a requisição)
    const optionsMapApi = {
      '1': '1a', // Fluxo completo custom (sem reiniciar)
      '2': '2',
      '3': '3',
      '4': '4',
      '5': '5',
      '6': '6',
      '7': '7',
      '8': '8',
      '9': '9'
    };
    
    const selectedOption = optionsMapApi[option] || optionsMap[option];
    
    if (!selectedOption) {
      return res.json({ success: false, log: 'Opção inválida. Escolha entre 1-9.' });
    }
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const command = `echo "${selectedOption}" | timeout 30 bash ${scriptPath}`;
      const { stdout, stderr } = await execAsync(command, { cwd: path.join(__dirname, '..'), timeout: 35000 });
      res.json({ success: true, log: stdout + stderr });
    } catch (error) {
      res.json({ success: false, log: `Erro: ${error.message}\n${error.stderr || ''}` });
    }
   });

   router.post('/restore', isAdmin, async (req, res) => {
     const tabela = req.query.tabela || req.body.tabela;
     const backupFile = req.query.backupFile || req.body.backupFile;
    
    if (!tabela || !backupFile) {
      return res.json({ success: false, log: 'Parâmetros inválidos. Informe a tabela e o arquivo de backup.' });
    }
    
    const backupDir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'backups');
    const backupPath = path.join(backupDir, backupFile);
    
    if (!fsNode.existsSync(backupPath)) {
      return res.json({ success: false, log: `Arquivo de backup não encontrado: ${backupFile}` });
    }
    
    const env = {
      ...process.env,
      PGDATABASE: process.env.DB_DATABASE || 'espelho',
      PGHOST: process.env.DB_HOST || 'localhost',
      PGPORT: process.env.DB_PORT || '5432',
      PGUSER: process.env.DB_USER || 'postgres',
      PGPASSWORD: process.env.DB_PASSWORD || 'wander'
    };
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      let log = `Iniciando restauração da tabela '${tabela}'...\n`;
      log += `Arquivo: ${backupFile}\n\n`;
      
      log += `1. Fazendo DROP da tabela '${tabela}'...\n`;
      await execAsync(`PGPASSWORD=${env.PGPASSWORD} psql -h ${env.PGHOST} -p ${env.PGPORT} -U ${env.PGUSER} -d ${env.PGDATABASE} -c "DROP TABLE IF EXISTS ${tabela};"`, { env });
      log += `   ✓ Tabela '${tabela}' removida (se existia).\n\n`;
      
      log += `2. Restaurando tabela do backup...\n`;
      const restoreCmd = `PGPASSWORD=${env.PGPASSWORD} pg_restore -h ${env.PGHOST} -p ${env.PGPORT} -U ${env.PGUSER} -d ${env.PGDATABASE} --data-only --table=${tabela} "${backupPath}"`;
      await execAsync(restoreCmd, { env });
      log += `   ✓ Dados restaurados com sucesso!\n`;
      
      res.json({ success: true, log });
    } catch (error) {
      res.json({ success: false, log: `Erro durante restauração: ${error.message}` });
    }
   });

   router.get('/backups', isAdmin, async (req, res) => {
    const backupDir = path.join(__dirname, '..', '..', 'amoranimal_uploads', 'backups');
    
    try {
      const files = await fsPromises.readdir(backupDir);
      const backupFiles = files
        .filter(f => f.endsWith('.dump.gz') || f.endsWith('.dump'))
        .sort()
        .reverse()
        .slice(0, 20);
      
      res.json({ success: true, files: backupFiles });
    } catch (error) {
      res.json({ success: false, files: [], error: error.message });
    }
   });
  
  router.get('/:tabela', isAdmin, async (req, res) => {
    const tabela = req.params.tabela;
    const allTables = await getAllTables();
    try {
     const data = await fetchReportData(tabela);
     // MES_NOME será usado para exibição, MES_NUM para lógica interna se necessário.
     const columnsToHideForHtml = ['origem', 'arquivo', 'ano', 'mes_num', 'mes_nome', 'isAdmin', 'updated_at', 'termo_arquivo', 'criado_por', 'whatsapp', 'senha', 'password', 'token', 'complemento'];
 
     const sanitizedData = data.map(row => {
      const sanitizedRow = {};
      for (const key in row) {
       if (!columnsToHideForHtml.includes(key)) {
        sanitizedRow[key] = sanitizeTextForPdf(row[key]);
       }
      }
      return sanitizedRow;
     });
     res.render('relatorio', {
      model: sanitizedData,
      tabela: tabela,
      tabelas: TABELAS_PERMITIDAS,
      todasTabelas: allTables
     });
    } catch (error) {
     console.error(`Erro GET /relatorio/${tabela}:`, error.message);
     const statusCode = error.status || 500;
     res.status(statusCode).render('error', {
      error: error.message || 'Erro ao buscar dados para o relatório.'
     });
    }
  });
 
  router.post('/:tabela', isAdmin, async (req, res) => {
   const tabela = req.params.tabela;
   let outputPath = '';
 
   try {
    const tableData = await fetchReportData(tabela);
 
    if (!tableData || tableData.length === 0) {
     return res.status(404).render('error', {
      error: `Nenhum dado encontrado para a tabela ${tabela}.`
     });
    }
 
     const columnsToRemoveForPdf = ['arquivo', 'ano', 'mes_num', 'mes_nome', 'origem', 'isAdmin', 'whatsapp', 'updated_at', 'termo_arquivo', 'criado_por', 'senha', 'password', 'token', 'complemento'];
    let tableHeaders = [];
    if (tableData.length > 0 && tableData[0]) {
     const originalHeaders = Object.keys(tableData[0]);
     tableHeaders = originalHeaders.filter(header =>
      !columnsToRemoveForPdf.includes(header) &&
      tableData[0][header] !== undefined
     );
    }
 
    const groupedByYearAndMonth = {};
    tableData.forEach(row => {
     const year = (row.ano !== null && row.ano !== undefined && String(row.ano).trim() !== '') ?
      String(row.ano) :
      "Dados Sem Agrupamento por Ano";
 
     const monthNum = (row.mes_num !== null && row.mes_num !== undefined && String(row.mes_num).trim() !== '') ?
      parseInt(String(row.mes_num), 10) // Guardar como número para ordenação
      :
      0; // Para "Dados Sem Agrupamento"
 
     const monthName = (row.mes_nome !== null && row.mes_nome !== undefined && String(row.mes_nome).trim() !== '') ?
      String(row.mes_nome) :
      "Mês Não Especificado";
 
     if (!groupedByYearAndMonth[year]) {
      groupedByYearAndMonth[year] = {};
     }
     if (!groupedByYearAndMonth[year][monthName]) {
      groupedByYearAndMonth[year][monthName] = {
       monthNum: monthNum,
       data: []
      };
     }
 
     const rowForDisplay = {};
     tableHeaders.forEach(header => {
      let cellValue = row[header];
      let displayValue = sanitizeTextForPdf(cellValue);
 
      if (header.toLowerCase() === 'status' && typeof displayValue === 'string') {
       displayValue = displayValue.replace(/pending/gi, 'Pendente')
        .replace(/approved/gi, 'Aprovado')
        .replace(/rejected/gi, 'Rejeitado');
      }
      if (header.toLowerCase() === 'descricao' && typeof displayValue === 'string') {
       displayValue = displayValue.replace(/\n\s*\n/g, '\n');
      }
      rowForDisplay[header] = displayValue;
     });
     groupedByYearAndMonth[year][monthName].data.push(rowForDisplay);
    });
 
    const content = [];
    const time = new Date().toLocaleDateString('pt-BR', {
     year: 'numeric',
     month: '2-digit',
     day: '2-digit',
     hour: '2-digit',
     minute: '2-digit',
     second: '2-digit'
    });
    // Cabeçalho movido para a função header do PDF
 
    if (tableHeaders.length === 0) {
     content.push({
      text: 'Nenhuma coluna para exibir (sem dados ou sem cabeçalhos definidos).',
      alignment: 'center'
     });
    } else {
     const columnWidths = tableHeaders.map(header => {
      if (header === 'id') return 'auto';
      if (['caracteristicas', 'historia', 'proposta', 'mensagem', 'descricao', 'data', 'complemento', 'quantidade', 'numero'].includes(header.toLowerCase())) return 'auto';
      return '*';
     });
 
     const abbreviatedHeaders = {
      'caracteristicas': 'Carac.',
      'historia': 'Hist.',
      'proposta': 'Prop.',
      'mensagem': 'Msg.',
      'descricao': 'Desc.',
      'complemento': 'Compl.',
      'quantidade': 'Quant.',
      'numero': 'No.'
 
 
     };
 
// Adiciona cabeçalhos da tabela no início (acima do primeiro ano)
      if (tableHeaders.length > 0) {
       content.push({
        table: {
          widths: columnWidths,
          body: [
           tableHeaders.map(header => ({
            text: abbreviatedHeaders[header.toLowerCase()] || sanitizeTextForPdf(header.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
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
      }

      const years = Object.keys(groupedByYearAndMonth).sort((a, b) => {
       if (a === "Dados Sem Agrupamento por Ano") return 1;
       if (b === "Dados Sem Agrupamento por Ano") return -1;
       return a.localeCompare(b); // Ordena anos
      });

       let isFirstYear = true;
       years.forEach(year => {
        if (!isFirstYear) {
         content.push({
          text: sanitizeTextForPdf(`Ano: ${year}`),
          style: 'yearMonthHeader'
         });
        }

        const monthsOfYear = groupedByYearAndMonth[year];
        const sortedMonthNames = Object.keys(monthsOfYear).sort((a, b) => {
         // Ordena os meses pelo monthNum armazenado
         if (monthsOfYear[a].monthNum === 0) return 1; // "Mês Não Especificado" ao final
         if (monthsOfYear[b].monthNum === 0) return -1;
         return monthsOfYear[a].monthNum - monthsOfYear[b].monthNum;
        });

        sortedMonthNames.forEach(monthName => {
         if (isFirstYear) {
          content.push({
           text: sanitizeTextForPdf(`Ano: ${year} - Mês: ${monthName}`),
           style: 'yearMonthHeader'
          });
         } else {
          content.push({
           text: sanitizeTextForPdf(`Mês: ${monthName}`),
           style: 'yearMonthHeader'
          });
         }

         const monthData = monthsOfYear[monthName].data;
         if (monthData.length === 0) {
          content.push({
           text: sanitizeTextForPdf(`Nenhum dado encontrado para ${monthName} de ${year}.`),
           style: 'subHeader',
           margin: [0, 5, 0, 10]
          });
          return;
         }

         const tableBody = [];

         monthData.forEach(dataRow => {
          const rowContent = tableHeaders.map(header => ({
           text: dataRow[header] !== undefined ? dataRow[header] : '',
           style: 'tableCell'
          }));
          tableBody.push(rowContent); // Adiciona a linha de dados
         });

         if (tableBody.length > 0) { // Só adiciona a tabela se houver dados
          content.push({
           table: {
            headerRows: 0, // Sem cabeçalhos repetidos
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
          content.push({
           text: ' ',
           margin: [0, 10]
          }); // Espaço entre tabelas de meses
         }
        });
        
        isFirstYear = false;
        content.push({
         text: ' ',
         margin: [0, 15]
        }); // Espaço maior entre anos
       });
    }
 
   const logoPath = path.join(__dirname, '..', 'static', 'css','imagem', 'ong.jpg');

    const docDefinition = { // Define o documento PDF
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
          text: sanitizeTextForPdf(`Relatório: ${tabela.charAt(0).toUpperCase() + tabela.slice(1)}`),
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
     pageOrientation: 'portrait', //or landscape (paisagem ou retrato)
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
       margin: [0, 0, 0, 5]
      },
yearHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 15, 0, 5],
        color: '#222222'
       },
       monthHeader: {
        fontSize: 12,
        bold: true,
        margin: [0, 10, 0, 5],
        color: '#444444'
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
    const pdfDoc = printer.createPdfKitDocument(docDefinition); // Cria o documento PDF
 
    res.setHeader('Content-Type', 'application/pdf'); // Define o cabeçalho para PDF
    res.setHeader('Content-Disposition', `attachment; filename=relatorio_${tabela}_${Date.now()}.pdf`); // Define o nome do arquivo
 
    pdfDoc.pipe(res);
    pdfDoc.end();
 
   } catch (error) {
    console.error(`Erro POST /relatorio/${tabela}:`, error.message);
    const statusCode = error.status || 500;
    res.status(statusCode).render('error', {
     error: error.message || 'Erro ao gerar o relatório PDF.'
    });
   }
  });
 
  router.post('/delete/:tabela/:id', isAdmin, async (req, res) => {
    const {
     tabela,
     id
    } = req.params;
    const client = await pool.connect(); // Obter um cliente do pool
    const allTables = await getAllTables();
  
     try {
      if (!allTables.includes(tabela)) {
       throw new Error(`Tabela não permitida para exclusão: ${tabela}`);
      }
  
      const deleteSql = `DELETE FROM ${tabela} WHERE id = $1`;
      const result = await client.query(deleteSql, [id]);
  
      if (result.rowCount === 0) {
       console.warn(`[relatorioRoutes DELETE] Nenhum registro encontrado na tabela '${tabela}' com ID: ${id} para deletar.`);
       req.flash('error', `Nenhum registro encontrado na tabela '${tabela}' com ID: ${id} para deletar.`);
      } else {
       console.log(`[relatorioRoutes DELETE] Registro da tabela '${tabela}' com ID: ${id} deletado.`);
       req.flash('success', `Registro da tabela '${tabela}' com ID: ${id} deletado com sucesso.`);
      }
      res.redirect(`/relatorio/${tabela}`);
  
     } catch (error) {
      console.error(`[relatorioRoutes DELETE] Erro ao deletar registro da tabela '${tabela}' com ID: ${id}:`, error);
      req.flash('error', `Erro ao deletar o registro da tabela '${tabela}'. Erro: ${error.message}`);
      res.status(500).redirect(`/relatorio/${tabela}`);
     } finally {
      client.release(); // Liberar o cliente de volta para o pool
     }
    });
 
  
      router.post('/edit/:tabela/:id', isAdmin, async (req, res) => {
       const {
        tabela,
        id
       } = req.params;
       const client = await pool.connect();
       const allTables = await getAllTables();
   
       try {
        if (!allTables.includes(tabela)) {
         throw new Error(`Tabela não permitida para edição: ${tabela}`);
        }
   
       const updates = req.body;
       const setClauses = [];
       const queryParams = [];
       let paramIndex = 1;
   
       for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
         setClauses.push(`${key} = $${paramIndex}`);
         queryParams.push(updates[key]);
         paramIndex++;
        }
       }
   
       if (setClauses.length === 0) {
        req.flash('error', 'Nenhum dado fornecido para atualização.');
        return res.redirect(`/relatorio/${tabela}`);
       }
   
       queryParams.push(id); // Add ID for WHERE clause
       const updateSql = `UPDATE ${tabela} SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`;
   
       const result = await client.query(updateSql, queryParams);
   
       if (result.rowCount === 0) {
        console.warn(`[relatorioRoutes EDIT] Nenhum registro encontrado na tabela '${tabela}' com ID: ${id} para atualizar.`);
        req.flash('error', `Nenhum registro encontrado na tabela '${tabela}' com ID: ${id} para atualizar.`);
       } else {
        console.log(`[relatorioRoutes EDIT] Registro da tabela '${tabela}' com ID: ${id} atualizado.`);
        req.flash('success', `Registro da tabela '${tabela}' com ID: ${id} atualizado com sucesso.`);
       }
       res.redirect(`/relatorio/${tabela}`);
   
      } catch (error) {
       console.error(`[relatorioRoutes EDIT] Erro ao editar registro da tabela '${tabela}' com ID: ${id}:`, error);
       req.flash('error', `Erro ao editar o registro da tabela '${tabela}'. Erro: ${error.message}`);
              res.status(500).redirect(`/relatorio/${tabela}`);
             } finally {
              client.release();
             }
             });
 
   module.exports = router;