// ============================================================================
// Iray App — espaço de chat privado a dois, instalável no telemóvel (PWA).
// Um único servidor Node (Express + WebSocket), sem dependência de
// WhatsApp/Telegram — vocês falam directamente com o vosso próprio servidor.
// ============================================================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');

const CONFIG = {
    // Nomes e PINs fixos aqui, ao estilo do Nano Bot — o PIN é o que dá
    // acesso à app (não há ecrã a mostrar os nomes antes de entrar).
    people: [
        { id: 'a', name: 'Yanick', pin: '8414' },
        { id: 'b', name: 'Iracema', pin: '8614' }
    ],
    groqApiKey: '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',
    groqBaseUrl: 'https://api.groq.com/openai/v1',
    groqModel: 'llama-3.3-70b-versatile',
    dataFile: path.join(__dirname, 'data', 'chat.json'),
    maxHistory: 500
};

if (!fs.existsSync(path.dirname(CONFIG.dataFile))) fs.mkdirSync(path.dirname(CONFIG.dataFile), { recursive: true });
if (!fs.existsSync(CONFIG.dataFile)) fs.writeFileSync(CONFIG.dataFile, JSON.stringify({ messages: [] }, null, 2));

function lerHistorico() {
    try { return JSON.parse(fs.readFileSync(CONFIG.dataFile, 'utf8')); } catch { return { messages: [] }; }
}
function gravarHistorico(db) {
    db.messages = db.messages.slice(-CONFIG.maxHistory);
    fs.writeFileSync(CONFIG.dataFile, JSON.stringify(db, null, 2));
}

// tokens simples em memória: token -> { id, name }
const sessoes = new Map();

// =================== IRAY (IA) ===================
async function perguntarIray(historicoRecente) {
    if (!CONFIG.groqApiKey) {
        return 'Ainda não tenho a minha chave de IA configurada (falta GROQ_API_KEY) — mas continuo aqui a guardar as vossas mensagens 💛';
    }
    const nomes = CONFIG.people.map(p => p.name).join(' e ');
    const systemPrompt = `Tu és o Iray, um assistente caloroso e presente que vive dentro do espaço privado de ${nomes}. `
        + `Respondes em português, de forma breve, natural e afectuosa, sem exageros nem emojis a mais. `
        + `Não inventas factos sobre a relação deles — só respondes ao que é dito na conversa.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...historicoRecente.map(m => ({
            role: m.autor === 'iray' ? 'assistant' : 'user',
            content: m.autor === 'iray' ? m.texto : `${m.nome}: ${m.texto}`
        }))
    ];

    try {
        const resp = await axios.post(`${CONFIG.groqBaseUrl}/chat/completions`, {
            model: CONFIG.groqModel,
            messages,
            max_tokens: 300,
            temperature: 0.8
        }, {
            headers: { 'Authorization': `Bearer ${CONFIG.groqApiKey}`, 'Content-Type': 'application/json' },
            timeout: 20000
        });
        return resp.data?.choices?.[0]?.message?.content?.trim() || 'Hmm, não consegui pensar numa resposta agora.';
    } catch (error) {
        console.error('Erro Groq:', error.response?.data || error.message);
        return 'Tive um problema a pensar agora — tenta outra vez daqui a pouco.';
    }
}

// =================== APP HTTP ===================
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', (req, res) => {
    const { pin } = req.body || {};
    const pessoa = CONFIG.people.find(p => String(p.pin) === String(pin));
    if (!pessoa) {
        return res.status(401).json({ erro: 'PIN incorreto.' });
    }
    const token = uuidv4();
    sessoes.set(token, { id: pessoa.id, name: pessoa.name });
    res.json({ token, name: pessoa.name, id: pessoa.id });
});

app.get('/api/mensagens', (req, res) => {
    const token = req.headers['x-token'];
    if (!sessoes.has(token)) return res.status(401).json({ erro: 'Sessão inválida.' });
    res.json(lerHistorico().messages);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(msg) {
    const payload = JSON.stringify(msg);
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(payload);
    });
}

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const sessao = sessoes.get(token);
    if (!sessao) { ws.close(4001, 'Sessão inválida'); return; }

    ws.on('message', async (raw) => {
        let data;
        try { data = JSON.parse(raw); } catch { return; }
        const texto = (data.texto || '').toString().trim().slice(0, 2000);
        if (!texto) return;

        const db = lerHistorico();
        const msg = { id: uuidv4(), autor: sessao.id, nome: sessao.name, texto, ts: Date.now() };
        db.messages.push(msg);
        gravarHistorico(db);
        broadcast({ tipo: 'mensagem', msg });

        // O Iray responde se for chamado directamente ("iray", "@iray") —
        // assim não fala por cima de toda a conversa a dois.
        if (/\biray\b/i.test(texto)) {
            const digitando = { tipo: 'digitando', autor: 'iray' };
            broadcast(digitando);
            const historicoRecente = db.messages.slice(-12);
            const resposta = await perguntarIray(historicoRecente);
            const msgIray = { id: uuidv4(), autor: 'iray', nome: 'Iray', texto: resposta, ts: Date.now() };
            const db2 = lerHistorico();
            db2.messages.push(msgIray);
            gravarHistorico(db2);
            broadcast({ tipo: 'mensagem', msg: msgIray });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`💛 Iray App em http://localhost:${PORT}`);
});
