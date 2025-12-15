import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, List, ListItem, ListItemText, TextField, Button } from '@mui/material';
import patientsService from '../../services/patients';
import { Patient, Entry, Diagnosis } from '../../types';
import axios from 'axios';

interface Props {
  diagnoses: Diagnosis[];
}

const PatientPage = ({ diagnoses }: Props) => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [error, setError] = useState<string | null>(null);

  // form state for a simple HealthCheck entry
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [specialist, setSpecialist] = useState('');
  const [healthCheckRating, setHealthCheckRating] = useState('0');
  const [codes, setCodes] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const p = await patientsService.getById(id);
        setPatient(p);
      } catch (e) {
        setError('Failed to fetch patient');
      }
    };
    void fetch();
  }, [id]);

  const submitEntry = async () => {
    if (!id) return;
    const diagnosisCodes = codes.split(',').map(c => c.trim()).filter(c => c.length > 0);
    const entry = {
      type: 'HealthCheck',
      date,
      description,
      specialist,
      diagnosisCodes,
      healthCheckRating: Number(healthCheckRating),
    } as Omit<Entry, 'id'>;

    try {
      const newEntry = await patientsService.addEntry(id, entry);
      setPatient(patient ? { ...patient, entries: patient.entries.concat(newEntry) } : null);
      setDate(''); setDescription(''); setSpecialist(''); setHealthCheckRating('0'); setCodes('');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg = e?.response?.data?.error || 'Failed to add entry';
        setError(String(msg));
      } else {
        setError('Failed to add entry');
      }
    }
  };

  const findDiagnosisName = (code: string) => diagnoses.find(d => d.code === code)?.name || '';

  if (!patient) return <Container><Typography>Loading patient...</Typography></Container>;

  return (
    <Container>
      <Typography variant="h4">{patient.name}</Typography>
      <Typography>SSN: {patient.ssn}</Typography>
      <Typography>Occupation: {patient.occupation}</Typography>

      <Typography variant="h6" style={{marginTop: '1em'}}>Entries</Typography>
      <List>
        {patient.entries.map(e => (
          <ListItem key={e.id}>
            <ListItemText
              primary={`${e.date} - ${e.description}`}
              secondary={
                <div>
                  {e.diagnosisCodes && e.diagnosisCodes.map(code => (
                    <div key={code}>{code} {findDiagnosisName(code)}</div>
                  ))}
                </div>
              }
            />
          </ListItem>
        ))}
      </List>

      <Typography variant="h6" style={{marginTop: '1em'}}>Add HealthCheck Entry</Typography>
      {error && <Typography color="error">{error}</Typography>}
      <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 400}}>
        <TextField label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} InputLabelProps={{shrink: true}} />
        <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} />
        <TextField label="Specialist" value={specialist} onChange={e => setSpecialist(e.target.value)} />
        <TextField label="Health Check Rating (0-3)" value={healthCheckRating} onChange={e => setHealthCheckRating(e.target.value)} />
        <TextField label="Diagnosis codes (comma separated)" value={codes} onChange={e => setCodes(e.target.value)} />
        <Button variant="contained" onClick={submitEntry}>Add Entry</Button>
      </div>
    </Container>
  );
};

export default PatientPage;
