import { Link } from "react-router-dom";

const Home = () => {
  return (
    <section className="text-center py-5">
      <h1 className="display-4 fw-bold">JobProof</h1>

      <p className="lead mt-3">
        Create professional PDF job reports for cleaners, tradies, handymen and
        service businesses.
      </p>

      <p className="text-muted">
        Add client details, work notes, issues, recommendations and photos.
        Then generate a clean report your customer can trust.
      </p>

      <div className="mt-4">
        <Link to="/create-report" className="btn btn-primary btn-lg">
          Create your first report
        </Link>
      </div>
    </section>
  );
};

export default Home;