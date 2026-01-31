 // /home/wander/amor.animal2/utils/multerConfig.js
 const multer = require('multer');
 const path = require('path');
 const fs = require('fs');
 
 /**
  * Ensures a directory exists. Creates it recursively if it doesn't.
  * @param {string} dirPath - The path to the directory.
  */
 function ensureDirExists(dirPath) {
     try {
         if (!fs.existsSync(dirPath)) {
             fs.mkdirSync(dirPath, { recursive: true });
             console.log(`Directory created: ${dirPath}`);
         } else {
             const stat = fs.statSync(dirPath);
             if (!stat.isDirectory()) {
                 throw new Error(`Path ${dirPath} exists but is not a directory.`);
             }
         }
     } catch (error) {
         const enhancedError = new Error(`Failed to ensure directory exists at ${dirPath}: ${error.message}`);
         enhancedError.cause = error;
         enhancedError.code = error.code;
         console.error(enhancedError.message);
         throw enhancedError;
     }
 }
 
 // Configuração para App Engine: usar /tmp para uploads
  // A constante __dirname aponta para o diretório do arquivo atual (utils).
  // '..' sobe um nível (para a raiz da aplicação, 'amoranimalmarilia').
  // '..' sobe mais um nível (para a pasta 'Public').
  // 'amoranimal_uploads' é a nova pasta que será criada ao lado da pasta da aplicação.
 const uploadBaseDir = path.join(__dirname, '..', '..', 'amoranimal_uploads');
 
 try {
   ensureDirExists(uploadBaseDir);
 } catch (error) {
   console.error(`[multerConfig] ERRO CRÍTICO AO INICIALIZAR DIRETÓRIO BASE DE UPLOAD (${uploadBaseDir}):`, error.message);
   // Em produção no App Engine, talvez você não queira lançar o erro aqui
   // para permitir que a aplicação inicie, mas logar é crucial.
   // throw error; // Considere remover ou tratar de forma diferente em produção.
 }
 
 // --- Google Cloud Specific Configuration (comentado como no original) ---
 // ... (mantido como no original)
 
 const createDiskStorageConfig = (subfolder) => {
     const destinationPath = path.join(uploadBaseDir, subfolder);
     ensureDirExists(destinationPath); // Cria o subdiretório específico
     return multer.diskStorage({
         destination: function (req, file, cb) {
             cb(null, destinationPath);
         },
         filename: function (req, file, cb) {
             const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
             const extension = path.extname(file.originalname);
             cb(null, file.fieldname + '-' + uniqueSuffix + extension);
         }
     });
 };
 
 const imageFileFilter = (req, file, cb) => {
     const filetypes = /pdf|mp4|jpeg|jpg|png|gif|webp/;
     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
     const mimetype = filetypes.test(file.mimetype);
     if (mimetype && extname) {
         return cb(null, true);
     } else {
         cb(new Error('Erro:Apenas os tipos de arquivos são permitidas (pdf, mp4,jpeg, jpg, png, gif, webp)!'), false);
     }
 };
 
 const createMulterInstance = (subfolder, fileFilter, limits) => {
     const storage = createDiskStorageConfig(subfolder);
     const multerOptions = { storage: storage };
     if (fileFilter) multerOptions.fileFilter = fileFilter;
     if (limits) multerOptions.limits = limits;
     return multer(multerOptions);
 };
 
 const defaultLimits = {
    fileSize: 10 * 1024 * 1024 // 10MB
 };
 
 try {
     module.exports = {
         uploadCastracao: createMulterInstance('castracao/', imageFileFilter, defaultLimits),
         uploadAdotado: createMulterInstance('adotado/', imageFileFilter, defaultLimits),
         uploadAdocao: createMulterInstance('adocao/', imageFileFilter, defaultLimits),
         uploadProcuraSe: createMulterInstance('procura_se/', imageFileFilter, defaultLimits),
         uploadHome: createMulterInstance('home/', imageFileFilter, defaultLimits),
         uploadCampanha: createMulterInstance('campanha/', imageFileFilter, defaultLimits),
         uploadParceria: createMulterInstance('parceria/', (req, file, cb) => {
             const filetypes = /jpeg|jpg|png|gif|webp|pdf/;
             const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
             const mimetype = filetypes.test(file.mimetype);
             if (mimetype && extname) {
                 return cb(null, true);
             } else {
                 cb(new Error('Erro: Tipo de arquivo não suportado para parceria!'), false);
             }
        }, defaultLimits),
        uploadTransparencia: createMulterInstance('transparencia/', imageFileFilter, defaultLimits),
        uploadTermo: createMulterInstance('termo_assinado/', imageFileFilter, defaultLimits)
     };
    //  console.log('[multerConfig] ATIVO.');
 } catch (error) {
     console.error('[multerConfig] ERRO CRÍTICO DURANTE A INICIALIZAÇÃO DO MÓDULO (após tentativa de criar subdiretórios):', error.message);
     module.exports = {};
 }
 
