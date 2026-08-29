import { createRoot } from 'react-dom/client';
import CityCourse from '../app/CityCourse';
import '../app/globals.css';

// The portable build reuses the exact same course, data, grading and persistence.
createRoot(document.getElementById('root')!).render(<CityCourse/>);

