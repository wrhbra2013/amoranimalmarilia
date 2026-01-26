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
 
  async function fetchReportData(tabela) {
   if (!TABELAS_PERMITIDAS.includes(tabela)) {
    const error = new Error(`Nome de tabela inválido: ${tabela}`);
    error.status = 400;
    throw error;
   }
 
   let sql;
   let selectFields = "*";
 
   if (TABELAS_COM_COLUNA_ORIGEM.includes(tabela.toLowerCase())) {
 
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
 
 
  router.get('/', isAdmin, (req, res) => {
   res.render('relatorio', {
    tabelas: TABELAS_PERMITIDAS
   });
  });
 
  router.get('/:tabela', isAdmin, async (req, res) => {
   const tabela = req.params.tabela;
   try {
    const data = await fetchReportData(tabela);
    // MES_NOME será usado para exibição, MES_NUM para lógica interna se necessário.
    const columnsToHideForHtml = ['origem', 'arquivo', 'ano', 'mes_num', 'mes_nome', 'isAdmin'];
 
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
     tabelas: TABELAS_PERMITIDAS
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
 
    const columnsToRemoveForPdf = ['arquivo', 'ano', 'mes_num', 'mes_nome', 'origem', 'isAdmin', 'whatsapp'];
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
 
     const years = Object.keys(groupedByYearAndMonth).sort((a, b) => {
      if (a === "Dados Sem Agrupamento por Ano") return 1;
      if (b === "Dados Sem Agrupamento por Ano") return -1;
      return a.localeCompare(b); // Ordena anos
     });
 
     years.forEach(year => {
      content.push({
       text: sanitizeTextForPdf(`Ano: ${year}`),
       style: 'yearHeader'
      });
 
      const monthsOfYear = groupedByYearAndMonth[year];
      const sortedMonthNames = Object.keys(monthsOfYear).sort((a, b) => {
       // Ordena os meses pelo monthNum armazenado
       if (monthsOfYear[a].monthNum === 0) return 1; // "Mês Não Especificado" ao final
       if (monthsOfYear[b].monthNum === 0) return -1;
       return monthsOfYear[a].monthNum - monthsOfYear[b].monthNum;
      });
 
      sortedMonthNames.forEach(monthName => {
       content.push({
        text: sanitizeTextForPdf(`Mês: ${monthName}`),
        style: 'monthHeader'
       });
 
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
       tableBody.push(tableHeaders.map(header => ({
        text: sanitizeTextForPdf(header.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
        text: abbreviatedHeaders[header.toLowerCase()] || sanitizeTextForPdf(header.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
        style: 'tableHeader',
        alignment: 'center'
       })));
 
       monthData.forEach(dataRow => {
        const rowContent = tableHeaders.map(header => ({
         text: dataRow[header] !== undefined ? dataRow[header] : '',
         style: 'tableCell'
        }));
        tableBody.push(rowContent); // Adiciona a linha de dados
       });
 
       if (tableBody.length > 1) { // Só adiciona a tabela se houver dados (além do cabeçalho)
        content.push({
         table: {
          headerRows: 1,
          widths: columnWidths,
          body: tableBody
         },
         layout: {
          hLineWidth: (i, node) => (i === 0 || i === node.table.body.length || i === 1) ? 0.5 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#333333',
          vLineColor: () => '#cccccc',
          paddingLeft: () => 3,
          paddingRight: () => 3,
          paddingTop: () => 2,
          paddingBottom: () => 2
         }
        });
        content.push({
         text: ' ',
         margin: [0, 10]
        }); // Espaço entre tabelas de meses
       }
      });
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
         text: 'Rua Alcides Caliman, 407\nJd. Bandeirantes\nMarília - SP\nhttps://amoranimalmarilia.ong.br',
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
      tableHeader: {
       bold: true,
       fontSize: 7,
       fillColor: '#E0E0E0',
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
 
    try {
     if (!TABELAS_PERMITIDAS.includes(tabela)) {
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
   
      try {
       if (!TABELAS_PERMITIDAS.includes(tabela)) {
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