import { useEffect, useState } from "react";

const isIOSDevice = () => {
  if (typeof window === "undefined") return false;

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
};

const isStandaloneMode = () => {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
};

const InstallAppButton = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setMessage("");
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setMessage("JobProof has been installed successfully.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    setMessage("");

    if (isInstalled) {
      return;
    }

    if (installPrompt) {
      installPrompt.prompt();

      const result = await installPrompt.userChoice;

      if (result.outcome === "accepted") {
        setMessage("Installing JobProof...");
      } else {
        setMessage("Installation was cancelled.");
      }

      setInstallPrompt(null);
      return;
    }

    if (isIOSDevice()) {
      setShowIOSHelp(true);
      return;
    }

    setMessage(
      "Open your browser menu and choose Install app or Add to Home screen."
    );
  };

  if (isInstalled) {
    return null;
  }

  return (
    <div className="install-app-card">
      <div>
        <p className="eyebrow mb-1">Mobile app</p>

        <h2 className="h5 mb-1">Install JobProof on your phone</h2>

        <p className="text-muted mb-0">
          Add JobProof to your home screen for quick access, full-screen use and
          a more app-like experience.
        </p>
      </div>

      <div className="install-app-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleInstallClick}
        >
          Install JobProof App
        </button>

        {message && <small className="text-muted">{message}</small>}
      </div>

      {showIOSHelp && (
        <div className="install-ios-help">
          <strong>Install on iPhone or iPad</strong>

          <ol className="mb-0 mt-2">
            <li>Open JobProof in Safari.</li>
            <li>Tap the Share button.</li>
            <li>Choose Add to Home Screen.</li>
            <li>Tap Add.</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default InstallAppButton;