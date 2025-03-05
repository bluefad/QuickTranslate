import ProjectList from "../components/projects/ProjectList";
import "./page.css"

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="page-header">
        <h1 className="page-title">Streamline Your Translations</h1>
        <p className="page-description">
        Effortlessly manage and translate projects with our intuitive platform. Start collaborating and delivering translations faster.
        </p>
      </div>
      <ProjectList />
    </div>
  );
};

export default HomePage;
