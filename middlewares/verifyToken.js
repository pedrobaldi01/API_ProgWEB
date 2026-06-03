function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(403).json({
            error: 'Token não informado'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        /* VALIDA TOKEN */
        const decoded = jwt.verify(token, SECRET);

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(403).json({
            error: 'Token inválido'
        });
    }
}

module.exports = verifyToken;