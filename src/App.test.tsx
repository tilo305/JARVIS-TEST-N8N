// Ultra-minimal test to see if React loads
import { createRoot } from "react-dom/client";

const TestApp = () => <div>TEST LOADED</div>;

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<TestApp />);
}
