import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import CreateReport from "./pages/CreateReport";
import Reports from "./pages/Reports";
import ReportDetails from "./pages/ReportDetails";

const App = () => {
  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Navbar />

        <main className="container py-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-report" element={<CreateReport />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:id" element={<ReportDetails />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;