import express, {Request, Response} from 'express';

const app = express();
const PORT = 3001;

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello World!');
});

app.get('/api/ping', (_req: Request, res: Response) => {
    res.json({ message: 'This is some data from the backend!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
