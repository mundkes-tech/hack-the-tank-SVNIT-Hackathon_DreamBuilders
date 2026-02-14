import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateCampaign from './pages/CreateCampaign';
import CollectTestimonial from './pages/CollectTestimonial';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateCampaign />} />
          <Route path="/collect/:campaignId" element={<CollectTestimonial />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
