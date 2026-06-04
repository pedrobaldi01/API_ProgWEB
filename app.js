const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const { Pool } = require("pg");
const publicacoesIniciais = require("./posts.json");

const app = express();
const port = process.env.PORT || 3000;
const camposObrigatorios = ["titulo", "descricao", "autor", "dataPublicacao", "fotoAutor"];
let publicacoes = [...publicacoesIniciais];
const jogosIniciais = [
    { nome: "The Legend of Zelda", categoria: "Aventura", ranking: 1 },
    { nome: "God of War", categoria: "Acao", ranking: 2 },
    { nome: "Minecraft", categoria: "Sandbox", ranking: 3 },
    { nome: "Subnautica", categoria: "Sobrevivencia", ranking: 4 },
    { nome: "Forager", categoria: "Aventura", ranking: 5 },
    { nome: "Horizon Zero Dawn", categoria: "RPG de Acao", ranking: 6 }
];


function normalizarDatabaseUrl(valor) {
    if (!valor) {
        return "";
    }

    return valor.replace(/^DATABASE_URL=/i, "").trim();
}

const databaseUrl = normalizarDatabaseUrl(process.env.DATABASE_URL || process.env.database_url);
const pool = new Pool(databaseUrl
    ? {
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });

app.use(cors());
app.use(express.json());
/* IMPORTA ROTA DE LOGIN */
const authRoutes = require('./routes/auth');
app.use(authRoutes);
/* IMPORTA MIDDLEWARE */
const verifyToken = require('./middlewares/verifyToken');
app.use(express.static(path.join(__dirname, "public")));

function validarPublicacao(dados) {
    return camposObrigatorios.filter((campo) => !dados[campo]);
}

async function prepararTabelaGames() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS games (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            categoria VARCHAR(255) NOT NULL,
            ranking INTEGER NOT NULL
        )
    `);

    for (const jogo of jogosIniciais) {
        await pool.query(
            "INSERT INTO games (nome, categoria, ranking) SELECT $1::varchar, $2::varchar, $3::integer WHERE NOT EXISTS (SELECT 1 FROM games WHERE nome = $1::varchar)",
            [jogo.nome, jogo.categoria, jogo.ranking]
        );
    }
}

app.get("/", (req, res) => {
    res.send("API_ProgWeb - acesse /posts");
});

app.get("/posts", (req, res) => {
    res.json(publicacoes);
});

app.get("/users", async (req, res) => {
    try {
        const query = "SELECT * FROM users";
        const result = await pool.query(query);

        return res.json(result.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "An error occurred" });
    }
});

app.post("/users", async (req, res) => {
    try {
        const { name, email } = req.body;
        const query = "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *";
        const values = [name, email];
        const result = await pool.query(query, values);

        return res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "An error occurred" });
    }
});

app.get("/games", verifyToken, async (req, res) => {
    try {
        await prepararTabelaGames();
        const result = await pool.query("SELECT * FROM games ORDER BY ranking, id");

        return res.json(result.rows);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: "Erro ao acessar banco de dados",
            code: err.code || "NO_CODE",
            message: err.message
        });
    }
});

app.post("/games", async (req, res) => {
    try {
        const { nome, categoria, ranking } = req.body;
        await prepararTabelaGames();
        const query = "INSERT INTO games (nome, categoria, ranking) VALUES ($1, $2, $3) RETURNING *";
        const values = [nome, categoria, ranking];
        const result = await pool.query(query, values);

        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: "Erro ao acessar banco de dados",
            code: err.code || "NO_CODE",
            message: err.message
        });
    }
});

app.put("/games/:id", async (req, res) => {
    try {
        const { nome, categoria, ranking } = req.body;
        await prepararTabelaGames();
        const query = "UPDATE games SET nome = $1, categoria = $2, ranking = $3 WHERE id = $4 RETURNING *";
        const values = [nome, categoria, ranking, req.params.id];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ mensagem: "Game nao encontrado." });
        }

        return res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: "Erro ao acessar banco de dados",
            code: err.code || "NO_CODE",
            message: err.message
        });
    }
});

app.delete("/games/:id", async (req, res) => {
    try {
        await prepararTabelaGames();
        const result = await pool.query("DELETE FROM games WHERE id = $1 RETURNING *", [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ mensagem: "Game nao encontrado." });
        }

        return res.status(204).send();
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            error: "Erro ao acessar banco de dados",
            code: err.code || "NO_CODE",
            message: err.message
        });
    }
});

app.get("/posts/:id", (req, res) => {
    const publicacao = publicacoes.find((item) => item.id === Number(req.params.id));

    if (!publicacao) {
        return res.status(404).json({ mensagem: "Publicacao nao encontrada." });
    }

    return res.json(publicacao);
});

app.post("/posts", (req, res) => {
    const camposInvalidos = validarPublicacao(req.body);

    if (camposInvalidos.length > 0) {
        return res.status(400).json({ mensagem: `Campos obrigatorios: ${camposInvalidos.join(", ")}.` });
    }

    const novoId = publicacoes.length === 0 ? 1 : Math.max(...publicacoes.map((item) => item.id)) + 1;
    const novaPublicacao = { ...req.body, id: novoId };

    publicacoes.push(novaPublicacao);

    return res.status(201).json(novaPublicacao);
});

app.put("/posts/:id", (req, res) => {
    const indice = publicacoes.findIndex((item) => item.id === Number(req.params.id));

    if (indice === -1) {
        return res.status(404).json({ mensagem: "Publicacao nao encontrada." });
    }

    const camposInvalidos = validarPublicacao(req.body);

    if (camposInvalidos.length > 0) {
        return res.status(400).json({ mensagem: `Campos obrigatorios: ${camposInvalidos.join(", ")}.` });
    }

    publicacoes[indice] = { ...req.body, id: publicacoes[indice].id };

    return res.json(publicacoes[indice]);
});

app.delete("/posts/:id", (req, res) => {
    const indice = publicacoes.findIndex((item) => item.id === Number(req.params.id));

    if (indice === -1) {
        return res.status(404).json({ mensagem: "Publicacao nao encontrada." });
    }

    publicacoes.splice(indice, 1);

    return res.status(204).send();
});

app.listen(port, () => {
    console.log(`running at http://localhost:${port}`);
});
