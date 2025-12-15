/* eslint-disable */
// @ts-nocheck
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

// Entry types for patient journal entries
export type HealthCheckRating = 0 | 1 | 2 | 3;

export interface BaseEntry {
    id: string;
    date: string;
    description: string;
    specialist: string;
    diagnosisCodes?: Array<string>;
}

export interface HealthCheckEntry extends BaseEntry {
    type: 'HealthCheck';
    healthCheckRating: HealthCheckRating;
}

export interface OccupationalHealthcareEntry extends BaseEntry {
    type: 'OccupationalHealthcare';
    employerName: string;
    sickLeave?: {
        startDate: string;
        endDate: string;
    };
}

export interface HospitalEntry extends BaseEntry {
    type: 'Hospital';
    discharge: {
        date: string;
        criteria: string;
    };
}

export type Entry = HealthCheckEntry | OccupationalHealthcareEntry | HospitalEntry;

type Patient = {
    id: string;
    name: string;
    dateOfBirth?: string;
    ssn?: string;
    gender: Gender;
    occupation: string;
    entries: Entry[];
};

// NewPatient shouldn't require entries
type NewPatient = Omit<Patient, 'id' | 'entries'>;

// Aseguramos una vista tipada de los datos importados para evitar errores de asignación
const patientsList: Patient[] = (patients as unknown as Patient[]).map(p => ({ ...p, entries: (p as unknown as { entries?: Entry[] }).entries ?? [] }));

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
    // For now we return full patients list (same as before) without sending entries in this endpoint
    res.json(patientsList.map(({entries: _entries, ...rest}) => rest));
});

app.get('/api/patients/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const patient = patientsList.find(p => p.id === id);
    if (!patient) {
        res.status(404).send({ error: 'Patient not found' });
        return;
    }
    res.json(patient);
});

app.post('/api/patients', (req: Request, res: Response) => {
    try {
        const newPatient = toNewPatient(req.body);
        const patient: Patient = {id: uuid(), ...newPatient, entries: []};
        patientsList.push(patient);
        res.status(201).json(patient);
    } catch (error: unknown) {
        console.error('Error creating patient:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({error: message, body: req.body});
    }
});

// Helper to parse optional diagnosis codes from request body (trusted format per exercise)
const parseDiagnosisCodes = (object: unknown): Array<string> =>  {
  if (!object || typeof object !== 'object' || !('diagnosisCodes' in (object as Record<string, unknown>))) {
    return [] as Array<string>;
  }

  return (object as Record<string, any>).diagnosisCodes as Array<string>;
};

app.post('/api/patients/:id/entries', (req: Request, res: Response) => {
    const id = req.params.id;
    const patientIndex = patientsList.findIndex(p => p.id === id);
    if (patientIndex === -1) {
        res.status(404).send({ error: 'Patient not found' });
        return;
    }

    try {
        const body = req.body as Record<string, any>;
        if (!body.type || typeof body.type !== 'string') {
            throw new Error('Missing or invalid type');
        }

        const base: Omit<BaseEntry, 'id'> = {
            date: parseDate(body.date),
            description: parseDescription(body.description),
            specialist: parseSpecialist(body.specialist),
            diagnosisCodes: parseDiagnosisCodes(body)
        };

        let newEntry: Entry;
        const entryId = uuid();

        switch (body.type) {
            case 'HealthCheck':
                if (body.healthCheckRating === undefined) throw new Error('Missing healthCheckRating');
                if (![0,1,2,3].includes(body.healthCheckRating)) throw new Error('Invalid healthCheckRating');
                newEntry = { id: entryId, type: 'HealthCheck', ...base, healthCheckRating: body.healthCheckRating } as HealthCheckEntry;
                break;
            case 'OccupationalHealthcare':
                if (!body.employerName) throw new Error('Missing employerName');
                const occ: OccupationalHealthcareEntry = { id: entryId, type: 'OccupationalHealthcare', ...base, employerName: String(body.employerName) };
                if (body.sickLeave && body.sickLeave.startDate && body.sickLeave.endDate) {
                    occ.sickLeave = { startDate: parseDate(body.sickLeave.startDate), endDate: parseDate(body.sickLeave.endDate) };
                }
                newEntry = occ;
                break;
            case 'Hospital':
                if (!body.discharge || !body.discharge.date || !body.discharge.criteria) throw new Error('Missing discharge information');
                newEntry = { id: entryId, type: 'Hospital', ...base, discharge: { date: parseDate(body.discharge.date), criteria: parseCriteria(body.discharge.criteria) } } as HospitalEntry;
                break;
            default:
                throw new Error('Incorrect entry type');
        }

        patientsList[patientIndex].entries = patientsList[patientIndex].entries.concat(newEntry);
        res.status(201).json(newEntry);
    } catch (error: unknown) {
        console.error('Error creating entry:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({ error: message });
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

const parseDate = (date: unknown): string => {
    if (!date || !isString(date) || !isDate(date)) throw new Error('Incorrect or missing date');
    return date;
};

const parseDescription = (desc: unknown): string => {
    if (!desc || !isString(desc)) throw new Error('Incorrect or missing description');
    return desc;
};

const parseSpecialist = (spec: unknown): string => {
    if (!spec || !isString(spec)) throw new Error('Incorrect or missing specialist');
    return spec;
};

const parseCriteria = (crit: unknown): string => {
    if (!crit || !isString(crit)) throw new Error('Incorrect or missing criteria');
    return crit;
};
