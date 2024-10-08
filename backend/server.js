/* server.js */
/* ----------------- */

const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');

const app = express();
const port = 3000;

// Redis istemcisini oluşturun
const client = redis.createClient({
    url: 'redis://localhost:6379'
});

// Redis bağlantısını açın
(async () => {
    await client.connect();
})();

// Middleware'leri kullanın
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// POST /todo endpoint'i
app.post('/todo', async (req, res) => {
    const { task } = req.body;
    if (!task) {
        return res.status(400).json({ error: 'Task parametresi gerekli' });
    }

    // ID'yi al ve artır
    const id = await client.incr('todo:id');

    const taskWithDetails = JSON.stringify({
        id: id,
        task: task,
        timestamp: new Date().toISOString()
    });

    await client.lPush('todos', taskWithDetails);
    res.status(201).json({ message: 'Görev başarıyla eklendi', id: id });
});

// GET /todos endpoint'i
app.get('/todos', async (req, res) => {
    const todos = await client.lRange('todos', 0, -1);
    const parsedTodos = todos.map(todo => {
        try {
            return JSON.parse(todo);
        } catch (error) {
            // Eğer JSON parse edilemezse, orijinal string'i bir task olarak kabul et
            return { id: 'Unknown', task: todo, timestamp: 'Unknown' };
        }
    });
    res.json(parsedTodos);
});

// DELETE /deleteAll endpoint'i
app.delete('/deleteAll', async (req, res) => {
    try {
        // Tüm görevleri sil
        await client.del('todos');

        // ID sayacını sıfırla
        await client.set('todo:id', 0);

        res.json({ message: 'Tüm görevler başarıyla silindi ve ID sayacı sıfırlandı.' });
    } catch (error) {
        res.status(500).json({ error: 'Görevler silinirken bir hata oluştu.' });
    }
});

// Sunucuyu başlatın
app.listen(port, () => {
    console.log(`Uygulama http://localhost:${port} adresinde çalışıyor`);
});