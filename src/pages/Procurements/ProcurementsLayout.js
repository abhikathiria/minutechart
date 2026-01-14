import { Outlet } from "react-router-dom";
import ProcurementsSidebar from "./ProcurementsSidebar";
import "./procurements.css";

export default function ProcurementsLayout() {
  return (
    <div className="party-layout">
      <ProcurementsSidebar />
      <div className="party-content">
        <Outlet />
      </div>
    </div>
  );
}
