import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import CreateReport from "./pages/CreateReport";
import Reports from "./pages/Reports";
import ReportDetails from "./pages/ReportDetails";
import BusinessProfile from "./pages/BusinessProfile";

const App = () => {
  return (
    <div className="app-container">
      <Navbar />

      <main className="container py-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-report" element={<CreateReport />} />
          <Route path="/edit-report/:id" element={<CreateReport />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:id" element={<ReportDetails />} />
          <Route path="/business-profile" element={<BusinessProfile />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;