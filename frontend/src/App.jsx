import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PetForm from './pages/PetForm';
import Recommendations from './pages/Recommendations';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PetForm />} />
        <Route path="/recommendations" element={<Recommendations />} />
      </Routes>
    </Router>
  );
}

export default App;
