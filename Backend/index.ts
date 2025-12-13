import express, {Request, Response} from 'express';
import {diagnoses, patients} from './data';
import {v1 as uuid} from 'uuid';

const app = express();
const PORT = 3001;

enum Gender {
    Male = 'male',
    Female = 'female',
    Other = 'other'
}

type Patient = {
    id: string;
    name: string;
    dateOfBirth?: string;
    ssn?: string;
    gender: Gender;
    occupation: string;
};

type NewPatient = Omit<Patient, 'id'>;

// Aseguramos una vista tipada de los datos importados para evitar errores de asignación
const patientsList: Patient[] = patients as unknown as Patient[];

app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
    res.send('Hello World!');
});

app.get('/api/ping', (_req: Request, res: Response) => {
    res.json({message: 'This is some data from the backend!'});
});

app.get('/api/diagnoses', (_req: Request, res: Response) => {
    res.json(diagnoses);
});

app.get('/api/patients', (_req: Request, res: Response) => {
    res.json(patientsList);
});

app.post('/api/patients', (req: Request, res: Response) => {
    try {
        const newPatient = toNewPatient(req.body);
        const patient: Patient = {id: uuid(), ...newPatient};
        patientsList.push(patient);
        res.status(201).json(patient);
    } catch (error: unknown) {
        console.error('Error creating patient:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({error: message, body: req.body});
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

/* ---------- Validation helpers ---------- */

const isString = (text: unknown): text is string => {
    return typeof text === 'string' || text instanceof String;
};

const isDate = (date: string): boolean => {
    return Boolean(Date.parse(date));
};

const isGender = (param: unknown): param is Gender => {
    return typeof param === 'string' && Object.values(Gender).includes(param as Gender);
};

const parseName = (name: unknown): string => {
    if (!name || !isString(name)) {
        throw new Error('Incorrect or missing name');
    }
    return name;
};

const parseDateOfBirth = (date: unknown): string | undefined => {
    if (date === undefined || date === null) return undefined;
    if (!isString(date)) return undefined;
    const d = date.trim();
    if (d === '') return undefined;
    if (!isDate(d)) throw new Error('Incorrect dateOfBirth');
    return d;
};

const parseSsn = (ssn: unknown): string | undefined => {
    if (ssn === undefined || ssn === null) return undefined;
    if (!isString(ssn)) throw new Error('Incorrect ssn');
    return ssn;
};

const parseGender = (gender: unknown): Gender => {
    if (!gender || !isGender(gender)) {
        throw new Error('Incorrect or missing gender');
    }
    return gender;
};

const parseOccupation = (occ: unknown): string => {
    if (!occ || !isString(occ)) {
        throw new Error('Incorrect or missing occupation');
    }
    return occ;
};

const toNewPatient = (object: unknown): NewPatient => {
    const obj = object as Record<string, unknown>;
    return {
        name: parseName(obj.name),
        dateOfBirth: parseDateOfBirth(obj.dateOfBirth),
        ssn: parseSsn(obj.ssn),
        gender: parseGender(obj.gender),
        occupation: parseOccupation(obj.occupation),
    };
};