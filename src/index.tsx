import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './views/Smart/Register';
import Index from './views/Smart/Index';
import Launch from './views/Smart/Launch';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const launch = () => {
  root.render(
    <Router>
      <Routes>
        <Route path="/index" element={<Index />} />
        <Route path="/launch?" element={<Launch />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
};

launch();
