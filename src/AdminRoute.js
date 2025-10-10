// AdminRoute.jsx
import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    if (!user.roles?.includes("Admin")) {
        return <Navigate to="/" replace />;
    }
    return children;
}