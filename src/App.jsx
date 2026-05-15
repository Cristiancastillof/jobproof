import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CreateReport from "./pages/CreateReport";
import Reports from "./pages/Reports";
import ReportDetails from "./pages/ReportDetails";
import BusinessProfile from "./pages/BusinessProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";

const HomeRoute = () => {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return (
      <section className="py-5 text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>

        <h1 className="h5">Loading JobProof</h1>
      </section>
    );
  }

  return isAuthenticated ? <Dashboard /> : <Home />;
};

const App = () => {
  return (
    <div className="app-container">
      <Navbar />

      <main className="container py-4">
        <Routes>
          <Route path="/" element={<HomeRoute />} />

          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          <Route
            path="/business-profile"
            element={
              <ProtectedRoute>
                <BusinessProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-report"
            element={
              <ProtectedRoute>
                <CreateReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/edit-report/:id"
            element={
              <ProtectedRoute>
                <CreateReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports/:id"
            element={
              <ProtectedRoute>
                <ReportDetails />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;