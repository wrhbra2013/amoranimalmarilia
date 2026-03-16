const express = require('express');
const app = express();
const session = require('express-session');

app.use(session({
    secret: '@admin',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true } // Defina como true se estiver usando HTTPS
}));


// /home/wander/amor.animal2/middleware/auth.js
function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) {
        req.user = req.session.user;
        
        next();
    } else {
        res.render('./logar')   
    };

};

// middleware/auth.js
exports.isAdmin = (req, res, next) => {
  if (req.session && req.session.user) {
      if (req.session.user.isAdmin) {
          return next();
      }
  }
  const wantsJson = req.accepts('html') !== 'html' || req.xhr || req.headers['accept']?.includes('application/json');
  if (wantsJson) {
    return res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador.' });
  }
  res.status(403).send('Acesso negado. Requer privilégios de administrador.');
};


module.exports = {
    isAdmin,
    
}