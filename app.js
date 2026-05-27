const express = require("express");
const cors = require("cors");
const swaggerUI = require("swagger-ui-express");
const fs = require("fs");
const path = require("path");
const jsYaml = require("js-yaml");
const publicacoesIniciais = require("./posts.json");

const app = express();
const port = process.env.PORT || 3000;
const swaggerFilePath = path.join(__dirname, "swagger.yaml");
const swaggerDocument = jsYaml.load(fs.readFileSync(swaggerFilePath, "utf8"));
const camposObrigatorios = ["titulo", "descricao", "autor", "dataPublicacao", "fotoAutor"];
let publicacoes = [...publicacoesIniciais];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

function validarPublicacao(dados) {
    return camposObrigatorios.filter((campo) => !dados[campo]);
}

app.get("/", (req, res) => {
    res.send("API_ProgWeb - acesse /posts ou /api-docs");
});

app.get("/posts", (req, res) => {
    res.json(publicacoes);
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
