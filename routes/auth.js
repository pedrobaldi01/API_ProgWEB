const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const SECRET = 'minha_chave_super_secreta';



router.post('/login', (req, res) => {
    console.log(req.body);
    const { email, password } = req.body;

    /* VALIDA LOGIN */
    if (email !== 'admin@email.com' || password !== '123456') {
        return res.status(401).json({
            error: 'Email ou senha inválidos'
        });
    }

    /* GERA TOKEN */
    const token = jwt.sign(
        { email: email },
        SECRET,
        { expiresIn: '1h' }
    );

    /* RETORNA TOKEN */
    res.json({
        message: 'Login realizado com sucesso',
        token: token
    });
});

module.exports = router;
