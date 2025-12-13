import express, { Request, Response } from 'express';
import { diagnoses, patients } from './data/index';

const app = express();
const PORT = 3001;

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello World!');
});

app.get('/api/ping', (_req: Request, res: Response) => {
    res.json({ message: 'This is some data from the backend!' });
});

app.get('/api/diagnoses', (_req: Request, res: Response) => {
    res.json(diagnoses);
});

app.get('/api/patients', (_req: Request, res: Response) => {
    res.json(patients);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});